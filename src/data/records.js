const persist=async(table,id,payload,updating=false)=>{
    const old=updating?(table==='kml_adults'?adult(id):table==='kml_lines'?byId(db.lines,id):table==='kml_larvae'?byId(db.larvae,id):null):null;
    if(updating&&!old?.updatedAt)throw Error('수정 기준 정보를 찾을 수 없습니다. 최신 목록을 불러와 다시 시도하세요.');
    const query=updating ? supa.from(table).update(payload).eq('id',id).eq('updated_at',old.updatedAt)
      : supa.from(table).insert({id,...payload});
    const {data,error}=await query.select().maybeSingle();
    if(error)throw error;
    if(!data)throw Error('다른 앱에서 먼저 수정했습니다. 창을 닫고 최신 내용을 확인한 뒤 다시 수정하세요.');
    return data;
  };
  const lineageLabel=(value,species='',generation='')=>{
    const text=String(value||'').trim();
    if(/^(WD|wild|와일드)$/i.test(String(generation||'').trim())||/와일드|wild/i.test(species)||/^(WD|wild|와일드)$/i.test(text))return 'Wild';
    return !text||text===species||/^왕사슴벌레(?:[（(].*[）)])?$/.test(text)?'미상':text;
  };
  const sourceLabel=value=>['우화','입양','채집'].includes(value)?value:value==='자체 우화'?'우화':'입양';
  const adultState=value=>value==='이동'?'분양':value==='종료'?'사망':(value||'보유');
  const adultRecord=a=>({code:a.code,lineage:a.lineage,generation:a.generation||'',sex:a.sex,size:a.size===''?null:Number(a.size),
    emerged:a.emerged||null,emerged_year:a.emergedYear||null,breeder_id:a.breeder||null,breeder_name:a.breeder?'':(a.breederName||''),owner_id:a.owner||null,
    father_id:a.father||null,mother_id:a.mother||null,source:a.source,status:a.status,note:a.note||'',photo_url:a.photoUrl||''});
  const lineRecord=l=>({name:l.name,father_id:l.father||null,mother_id:l.mother,generation:l.generation||'',is_wild:!!l.isWild,year:l.year?Number(l.year):null,method:l.method||'',note:l.note||'',...(isAdmin()&&l.createdBy?{created_by:l.createdBy}:{})});
  // Memory-only snapshots are scoped to the signed-in account; never cache private data on disk.
  const remoteTables=['kml_profiles','kml_adults','kml_lines','kml_larvae','kml_comments','kml_transfers'];
  const versionedTables=new Set(['kml_adults','kml_lines','kml_larvae']);
  let remoteSnapshot=null,remoteGeneration=0,remoteQueue=Promise.resolve();
  function resetRemoteSnapshot(){remoteSnapshot=null;remoteGeneration++;}
  async function fetchRemoteRows(name,ids=null){
    const rows=[],key=name==='kml_profiles'?'user_id':'id';
    // Stable ordering and pages also cover databases larger than the API's 1,000-row limit.
    const batches=ids?Array.from({length:Math.ceil(ids.length/100)},(_,i)=>ids.slice(i*100,i*100+100)):[null];
    for(const batch of batches){
      for(let offset=0;;offset+=500){
        let query=supa.from(name).select('*').order(key,{ascending:true});
        if(batch)query=query.in(key,batch);
        const {data,error}=await query.range(offset,offset+499);
        if(error)throw new Error(name+': '+error.message);
        rows.push(...(data||[]));
        if((data||[]).length<500)break;
      }
    }
    return rows;
  }
  function loadRemote(){
    const account=authUser?.id,accessRole=role,generation=remoteGeneration;
    const job=remoteQueue.catch(()=>{}).then(()=>loadRemoteSnapshot(account,accessRole,generation));
    remoteQueue=job;return job;
  }
  async function loadRemoteSnapshot(account,accessRole,generation){
    if(!account||authUser?.id!==account||role!==accessRole||remoteGeneration!==generation)return false;
    const scope=account+':'+accessRole,cached=remoteSnapshot?.scope===scope?remoteSnapshot:null;
    let rows,versions={},changed=true;
    if(cached){
      const {data:manifest,error}=await supa.rpc('kml_sync_manifest',{p_known:cached.versions});
      if(error)throw error;
      if(manifest?.schema!==1||!manifest.versions||!manifest.rows)throw Error('동기화 응답을 확인할 수 없습니다.');
      versions=manifest.versions;
      for(const name of remoteTables)if(typeof versions[name]!=='string')throw Error('동기화 기준 정보가 없습니다.');
      changed=remoteTables.some(name=>versions[name]!==cached.versions[name]);
      if(!changed)return false;
      rows={...cached.rows};
      await Promise.all(remoteTables.map(async name=>{
        if(versions[name]===cached.versions[name])return;
        if(!versionedTables.has(name)){rows[name]=await fetchRemoteRows(name);return;}
        const entries=manifest.rows[name];
        if(!Array.isArray(entries)||entries.some(x=>!Array.isArray(x)||x.length!==2||typeof x[0]!=='string'||typeof x[1]!=='string'))throw Error('개체 동기화 기준 정보가 없습니다.');
        const old=new Map(cached.rows[name].map(x=>[x.id,x])),wanted=new Set(entries.map(x=>x[0]));
        const ids=entries.filter(([id,version])=>old.get(id)?.updated_at!==version).map(([id])=>id);
        const fresh=await fetchRemoteRows(name,ids),fetched=new Set(fresh.map(x=>x.id));
        rows[name]=[...cached.rows[name].filter(x=>wanted.has(x.id)&&!fetched.has(x.id)&&!ids.includes(x.id)),...fresh];
        rows[name].sort((a,b)=>a.id.localeCompare(b.id));
      }));
    }else{
      const results=await Promise.all(remoteTables.map(fetchName=>fetchRemoteRows(fetchName)));
      rows=Object.fromEntries(remoteTables.map((name,i)=>[name,results[i]]));
    }
    const [p,a,l,v,c,t]=remoteTables.map(name=>rows[name]);

    let profiles=p;
    let labels=cached?.labels||[];
    if(accessRole!=='admin'&&(!cached||versions.kml_profiles!==cached.versions.kml_profiles)){
      const {data:visibleLabels,error:labelError}=await supa.rpc('kml_visible_breeder_labels');
      if(labelError)throw labelError;
      labels=visibleLabels||[];
    }
    if(accessRole!=='admin'){
      const found=new Set(p.map(x=>x.user_id));
      profiles=[...p,...(labels||[]).filter(x=>!found.has(x.user_id)).map(x=>({user_id:x.user_id,nickname:x.nickname,avatar_url:x.avatar_url,intro:''}))];
    }
    // A failed request or an account switch cannot partially replace the current database.
    if(authUser?.id!==account||role!==accessRole||remoteGeneration!==generation)return false;
    remoteSnapshot={scope,rows,versions,labels};
    db={currentUser:account,
      members:profiles.map(x=>({id:x.user_id,nickname:x.nickname,intro:x.intro||'',avatar_url:x.avatar_url||'',
        role:x.user_id===authUser.id&&role==='admin'?'관리자':'브리더',initial:(x.nickname||'K')[0],color:'#a68758'})),
      adults:a.map(x=>({id:x.id,code:x.code,lineage:lineageLabel(x.lineage,x.species,x.generation),generation:x.generation||'',sex:x.sex,size:x.size===null?'':String(x.size),emerged:x.emerged||'',emergedYear:x.emerged_year||'',
        breeder:x.breeder_id||'',breederName:x.breeder_name||'',owner:x.owner_id||'',father:x.father_id||'',mother:x.mother_id||'',status:adultState(x.status),
        source:sourceLabel(x.source),note:x.note||'',photoUrl:x.photo_url||'',species:x.species||'',beetlelogId:x.beetlelog_id||'',beetlelogOwner:x.beetlelog_owner_id||'',createdAt:x.created_at||'',updatedAt:x.updated_at||''})),
      lines:l.map(x=>({id:x.id,name:x.name,father:x.father_id,mother:x.mother_id,year:x.year||'',generation:x.generation||'',isWild:!!x.is_wild,method:x.method||'',note:x.note||'',createdBy:x.created_by||'',species:x.species||'',beetlelogId:x.beetlelog_id||'',beetlelogOwner:x.beetlelog_owner_id||'',createdAt:x.created_at||'',updatedAt:x.updated_at||''})),
      larvae:v.map(x=>({id:x.id,lineId:x.line_id,number:x.number,sex:x.sex||'U',records:x.records||[],emerged:x.emerged||'',size:x.size===null?'':String(x.size),sourceData:x.source_data||{},updatedAt:x.updated_at||'',beetlelogId:x.beetlelog_id||'',beetlelogOwner:x.beetlelog_owner_id||''})),
      comments:c.map(x=>({id:x.id,adultId:x.adult_id,memberId:x.member_id,body:x.body,date:(x.created_at||'').slice(0,10)})),
      transfers:t.map(x=>({id:x.id,adultId:x.adult_id,from:x.from_user,to:x.to_user,date:x.transfer_date,note:x.note||''}))
    };
    return changed;
  }
  

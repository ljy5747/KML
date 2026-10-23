function gate(){
    const isWaiting=!authReady;
    app.innerHTML=`<div class="access-wrap"><section class="access-card"><div class="access-mark access-mark--official"><img src="${OFFICIAL_LOGO}" class="login-official-logo" alt="국균연구소 공식 원형 마크" /></div>
      <p class="access-kicker">국균연구소 · BREEDERS ONLY</p><h1>${isWaiting?'접속 확인 중':authUser?(allowed?'데이터 연결 실패':'승인된 계정만 접근할 수 있습니다'):'국균연구소'}</h1>
      <p>${esc(isWaiting?'로그인 상태를 확인하고 있습니다.':loginError|| (authUser&&!allowed?'Google 로그인이 완료되었지만 연구소 승인 목록에 없는 계정입니다. 관리자에게 등록을 요청하세요.':'왕사슴벌레 개체·혈통·사육 라인 통합관리 시스템'))}</p>
      ${authUser?`<small>${esc(authUser.email||'')}</small><div style="margin-top:23px"><button class="btn btn-light" data-action="sign-out">Google 로그아웃</button></div>`:
      `<button class="btn btn-gold" data-action="google-login" ${isWaiting||!supa?'disabled':''}>Google 계정으로 로그인</button>`}
      <div class="access-note">계정 승인과 데이터 접근은 Supabase 서버 권한 정책으로 보호됩니다.<br>실제 사육정보는 승인 전에는 조회할 수 없습니다.</div>
    </section></div>`;
  }
  async function boot(){
    if(!supa){loginError='인증 라이브러리를 불러오지 못했습니다. 네트워크 연결을 확인하세요.';authReady=true;gate();return;}
    gate();
    try{
      const {data,error}=await supa.auth.getUser();
      if(error && error.name!=='AuthSessionMissingError')throw error;
      authUser=data?.user||null;
      if(authUser){
        const email=String(authUser.email||'').toLowerCase();
        const {data:match,error:err}=await supa.from('kml_allowed_emails').select('role,active').eq('email',email).eq('active',true).maybeSingle();
        if(err)throw err;
        if(match){
          role=match.role;
          const {data:existing,error:pe}=await supa.from('kml_profiles').select('user_id').eq('user_id',authUser.id).maybeSingle();
          if(pe)throw pe;
          if(!existing){
            const nickname=String(authUser.user_metadata?.full_name||authUser.user_metadata?.name||email.split('@')[0]||'브리더').slice(0,30);
            const avatar_url=/^https:\/\//.test(String(authUser.user_metadata?.avatar_url||''))?authUser.user_metadata.avatar_url:'';
            const {error:ie}=await supa.from('kml_profiles').insert({user_id:authUser.id,nickname,avatar_url});
            if(ie)throw ie;
          }
          await loadRemote();allowed=true;
        }
      }
    }catch(e){loginError='인증 또는 데이터 조회 오류: '+(e.message||e);allowed=false;}
    authReady=true;
    if(allowed){showStandaloneHome(false);render();}else gate();
  }
  
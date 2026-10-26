(() => {
  const form=document.getElementById('wt-contact-form');
  const button=form.querySelector('button[type="submit"]');
  const status=document.getElementById('wt-status');
  let token='',widgetId,busy=false;
  const show=message=>{status.textContent=message;};
  const ready=value=>{token=value;button.disabled=busy || !value;};
  button.disabled=true;
  window.wtTurnstileReady=async()=>{
    try {
      const response=await fetch('/api/form-config');
      if(!response.ok) throw new Error('config');
      const config=await response.json();
      widgetId=window.turnstile.render('#wt-turnstile',{
        sitekey:config.siteKey,action:'zgloszenie',theme:'dark',callback:ready,
        'expired-callback':()=>ready(''),'error-callback':()=>{ready('');show('Weryfikacja niedostępna. Spróbuj ponownie lub zadzwoń.');}
      });
      show('');
    } catch {show('Formularz jest chwilowo niedostępny. Zadzwoń: 664 491 844 lub napisz przez WhatsApp.');}
  };
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy || !token || !form.reportValidity()) return;
    busy=true;button.disabled=true;
    show('Wysyłanie zgłoszenia…');
    const value=id=>document.getElementById(id).value.trim();
    try {
      const response=await fetch('/api/zgloszenie',{
        method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(25000),
        body:JSON.stringify({name:value('wt-name'),phone:value('wt-phone'),vehicle:value('wt-vehicle'),issue:value('wt-issue'),
          consent:document.getElementById('wt-consent').checked,website:value('wt-website'),turnstileToken:token})
      });
      const result=await response.json();
      if(response.status!==201 || result.ok!==true) throw new Error('send');
      form.reset();
      show('Zgłoszenie zostało przyjęte. Skontaktujemy się z Tobą. Termin wymaga osobnego potwierdzenia.');
    } catch {
      show('Nie udało się potwierdzić przyjęcia zgłoszenia. Przed ponowną wysyłką zadzwoń: 664 491 844, aby uniknąć duplikatu.');
    } finally {
      busy=false;ready('');
      if(widgetId!==undefined) window.turnstile.reset(widgetId);
    }
  });
  const script=document.createElement('script');
  script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?onload=wtTurnstileReady&render=explicit';
  script.async=true;script.defer=true;
  script.onerror=()=>show('Weryfikacja niedostępna. Zadzwoń: 664 491 844.');
  document.head.appendChild(script);
})();

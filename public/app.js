const $=x=>document.getElementById(x);let contacts=[],journeys=[],active=null,watchId=null,liveMap=null,liveMarker=null,mapHasInitialView=false;
const api=async(url,opts={})=>{const r=await fetch(url,{headers:{'Content-Type':'application/json'},...opts});const d=await r.json().catch(()=>({error:'Invalid server response'}));if(!r.ok)throw Error(d.error||'Request failed');return d};
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=d=>d?new Date(d).toLocaleString(): '—';
function note(m,error=false){$('notice').textContent=m;$('notice').className='notice'+(error?' error':'');setTimeout(()=>$('notice').classList.add('hide'),8000)}
async function loadContacts(){contacts=await api('/api/contacts');$('contactSelect').innerHTML='<option value="">Choose trusted contact</option>'+contacts.map(c=>`<option value="${c.id}">${esc(c.name)} · ${esc(c.phone)}</option>`).join('');$('contacts').innerHTML=contacts.map(c=>`<div class="listitem"><span><b>${esc(c.name)}</b><small>${esc(c.phone)} · ${esc(c.email)} ${esc(c.relationship)}</small></span><button class="remove" data-remove="${c.id}">Delete</button></div>`).join('')||'<p class="muted">Add at least one trusted contact.</p>';document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=async()=>{if(confirm('Delete this contact?'))try{await api('/api/contacts/'+b.dataset.remove,{method:'DELETE'});await loadContacts();note('Contact deleted.')}catch(e){note(e.message,true)}})}
async function loadJourneys(){journeys=await api('/api/journeys');active=journeys.find(j=>j.status==='ACTIVE')||null;renderActive();$('history').innerHTML=journeys.slice(0,8).map(j=>`<div class="listitem"><span><b>${esc(j.destination)}</b><small>${fmt(j.startedAt)} · ETA ${fmt(j.eta)}</small></span><span class="pill">${esc(j.status)}</span></div>`).join('')||'<p class="muted">No journeys recorded.</p>'}
function renderActive(){if(!active){$('active').classList.add('hide');stopGps();return}$('active').classList.remove('hide');$('journeyTitle').textContent=active.destination;$('meta').textContent=`ETA ${fmt(active.eta)} · ${active.safetyState} · Sharing ${active.locationSharing?'ON':'OFF'}`;$('status').textContent=active.safetyState;$('shareToggle').checked=!!active.locationSharing;const l=active.location;if(l){$('coords').textContent=`${l.latitude.toFixed(6)}, ${l.longitude.toFixed(6)}`;$('locTime').textContent='Last update '+fmt(l.capturedAt);$('map').classList.remove('hide');$('mapEmpty').classList.add('hide');updateLiveMap(l.latitude,l.longitude)}else{$('coords').textContent='Waiting for GPS location';$('locTime').textContent='No valid coordinates saved yet';$('map').classList.remove('hide');$('mapEmpty').classList.remove('hide');initMap()}$('events').innerHTML=(active.events||[]).map(e=>`<div class="event"><b>${esc(e.message)}</b><small>${fmt(e.at)} · ${esc(e.type)}</small></div>`).join('')||'<p class="muted">No events yet.</p>';$('copy').dataset.url=location.origin+'/share/'+active.shareToken;if(active.locationSharing)startGps();else stopGps()}

function initMap(){
 if(liveMap || !window.L) return;
 // Keep the map visible even before GPS permission is granted. GPS will center it once a fix arrives.
 liveMap=L.map('map',{zoomControl:true,scrollWheelZoom:true}).setView([20.5937,78.9629],5);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
   maxZoom:19, attribution:'&copy; OpenStreetMap contributors',
   crossOrigin:true
 }).addTo(liveMap);
 liveMap.on('tileerror',()=>{$('gpsStatus').textContent='Map tiles could not load. Check your internet connection.';});
 setTimeout(()=>liveMap.invalidateSize(),250);
}
function updateLiveMap(lat,lon){
 if(!window.L){$('gpsStatus').textContent='Map library did not load. Check internet connection and refresh.';return;}
 initMap();
 if(!liveMap)return;
 if(!liveMarker){
   liveMarker=L.marker([lat,lon]).addTo(liveMap).bindPopup('Current device location');
   // Center and zoom only for the first valid GPS fix; later fixes move only the marker.
   if(!mapHasInitialView){liveMap.setView([lat,lon],16);mapHasInitialView=true;}
   setTimeout(()=>liveMap.invalidateSize(),150);
 } else {
   liveMarker.setLatLng([lat,lon]);
 }
}
async function savePosition(p){if(!active)return;const id=active.id;await api(`/api/journeys/${id}/location`,{method:'POST',body:JSON.stringify({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy})});active=await api('/api/journeys/'+id);const l=active.location;if(l){$('coords').textContent=`${l.latitude.toFixed(6)}, ${l.longitude.toFixed(6)}`;$('locTime').textContent='Last update '+fmt(l.capturedAt);$('map').classList.remove('hide');$('mapEmpty').classList.add('hide');updateLiveMap(l.latitude,l.longitude)}$('gpsStatus').textContent=`GPS active · accuracy ±${Math.round(p.coords.accuracy)} m`;}
function gpsError(e){const messages={1:'Location permission denied. Allow it in browser/site settings.',2:'Location unavailable. Turn on device Location/GPS and try again.',3:'Location request timed out. Move near a window or retry.'};$('gpsStatus').textContent=messages[e.code]||'Could not get location. Retry.';}
function startGps(){if(watchId!==null||!active||!active.locationSharing)return;if(!navigator.geolocation){$('gpsStatus').textContent='This browser does not support GPS.';return}if(!window.isSecureContext){$('gpsStatus').textContent='Browser requires HTTPS or localhost for GPS. Open http://localhost:4000 on this computer.';return}$('gpsStatus').textContent='Requesting GPS permission…';watchId=navigator.geolocation.watchPosition(p=>savePosition(p).catch(e=>{$('gpsStatus').textContent='Could not save GPS update: '+e.message}),e=>{gpsError(e);watchId=null},{enableHighAccuracy:true,maximumAge:0,timeout:25000});}
function refreshLocation(){if(!active){note('Start a journey first.',true);return}if(!navigator.geolocation){gpsError({code:2});return}if(!window.isSecureContext){$('gpsStatus').textContent='GPS needs HTTPS or localhost. Open http://localhost:4000.';return}$('gpsStatus').textContent='Getting current device location…';navigator.geolocation.getCurrentPosition(p=>savePosition(p).catch(e=>{$('gpsStatus').textContent='Could not save location: '+e.message}),gpsError,{enableHighAccuracy:true,maximumAge:0,timeout:25000});if(active.locationSharing)startGps();}

function stopGps(){if(watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watchId);watchId=null}
$('contactForm').onsubmit=async e=>{e.preventDefault();try{await api('/api/contacts',{method:'POST',body:JSON.stringify({name:$('contactName').value,phone:$('contactPhone').value,email:$('contactEmail').value,relationship:$('relationship').value})});e.target.reset();await loadContacts();note('Trusted contact saved.')}catch(x){note(x.message,true)}};
$('journeyForm').onsubmit=async e=>{e.preventDefault();try{const j=await api('/api/journeys',{method:'POST',body:JSON.stringify({destination:$('destination').value,destinationAddress:$('address').value,eta:new Date($('eta').value).toISOString(),contactId:$('contactSelect').value,locationSharing:$('sharing').checked,reminderIntervalMinutes:Number($('interval').value)})});active=j;await loadJourneys();note('Journey started. Enable browser location permission for GPS updates.')}catch(x){note(x.message,true)}};
$('shareToggle').onchange=async e=>{try{const d=await api(`/api/journeys/${active.id}/sharing`,{method:'POST',body:JSON.stringify({enabled:e.target.checked})});if(d.shareToken)active.shareToken=d.shareToken;await loadJourneys();note(e.target.checked?'Location sharing enabled.':'Sharing disabled and previous link revoked.')}catch(x){note(x.message,true)}};
$('locate').onclick=refreshLocation;
$('safe').onclick=async()=>{try{await api(`/api/journeys/${active.id}/safe`,{method:'POST',body:'{}'});await loadJourneys();note('Safety confirmed. All remaining reminders cancelled.')}catch(x){note(x.message,true)}};
$('end').onclick=async()=>{if(!confirm('End journey and revoke location sharing?'))return;try{await api(`/api/journeys/${active.id}/end`,{method:'POST',body:'{}'});stopGps();await loadJourneys();note('Journey ended; location link revoked and reminders cancelled.')}catch(x){note(x.message,true)}};
async function sos(){if(!confirm('Send an SOS alert to the configured trusted contact? If alert providers are not configured, this will only record the SOS.'))return;try{const d=await api('/api/sos',{method:'POST',body:JSON.stringify({journeyId:active?.id||null})});note(d.message,!d.deliveryConfigured);await loadJourneys()}catch(x){note(x.message,true)}}
$('sos').onclick=sos;$('copy').onclick=async()=>{const u=$('copy').dataset.url;if(!u||u.endsWith('/null'))return note('Enable sharing first.',true);try{await navigator.clipboard.writeText(u);note('Private location link copied. Share only with the intended contact.')}catch(e){prompt('Copy this private link:',u)}};
$('refresh').onclick=async()=>{try{await loadJourneys();note('Activity refreshed.')}catch(e){note(e.message,true)}};
async function loadDelivery(){try{const c=await api('/api/alerts/config');$('deliveryStatus').textContent=`Real delivery enabled: ${c.realAlertsEnabled?'YES':'NO'} · Email configured: ${c.emailConfigured?'YES':'NO'} · SMS configured: ${c.smsConfigured?'YES':'NO'}`}catch(e){$('deliveryStatus').textContent='Could not read alert configuration.'}}
function setDefaultEta(){let d=new Date(Date.now()+60*60*1000);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());$('eta').value=d.toISOString().slice(0,16)}
async function init(){setDefaultEta();initMap();try{await api('/api/health');await loadContacts();await loadJourneys();await loadDelivery()}catch(e){note('Backend error: '+e.message,true)}setInterval(async()=>{try{if(active)await loadJourneys()}catch(e){}},6000)}
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});init();
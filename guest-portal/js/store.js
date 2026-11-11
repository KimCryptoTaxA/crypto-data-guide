/* Data layer.
 * Demo mode keeps everything in localStorage, and the browser "storage" event
 * syncs open tabs live (guest tab -> admin tab notifications and back).
 * To go live, replace load/save/subscribe with a real backend (e.g. Supabase)
 * while keeping the same Store API used by guest.js and admin.js.
 */

const REQUEST_TYPES = {
  request: 'Item request',
  issue: 'Issue report',
  service: 'Add-on service',
  early_checkin: 'Early check-in',
  late_checkout: 'Late checkout',
  extend_stay: 'Extend stay',
  housekeeping: 'Housekeeping',
  lost_found: 'Lost & found',
  luggage: 'Luggage storage',
};
const STATUSES = ['new', 'in_progress', 'approved', 'declined', 'done'];
const STATUS_LABEL = { new: 'New', in_progress: 'In progress', approved: 'Approved', declined: 'Declined', done: 'Done' };

const bi = (en, fil) => ({ en, fil });

function seedData() {
  const today = ymd();
  return {
    version: 1,
    settings: {
      brandName: 'Casa Serena Stays',
      tagline: bi('Your home away from home', 'Ang iyong tahanan malayo sa tahanan'),
      hostName: 'Your Host',
      hostPhone: '+63 900 000 0000',
      hostEmail: 'host@example.com',
      currency: '₱',
      adminPin: '1234',
      accent: '#29453a',
      quickReplies: [
        'Noted! We will take care of it shortly.',
        'On the way — should be there within 30 minutes.',
        'Approved. See you then!',
        'Sorry, that is not available for those dates.',
        'All done. Let us know if you need anything else.',
      ],
    },
    properties: [{
      id: 'p_harbor',
      name: bi('The Harbor Suite', 'The Harbor Suite'),
      address: 'Mactan, Lapu-Lapu City, Cebu',
      heroImage: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=70',
      welcome: bi(
        'Welcome! We are delighted to host you. Everything you need for your stay is right here — from Wi-Fi to the best places to eat nearby. If you need anything, just send a request and we will take care of it.',
        'Maligayang pagdating! Masaya kaming kayo ay aming bisita. Narito ang lahat ng kailangan ninyo sa inyong pananatili — mula Wi-Fi hanggang sa pinakamagagandang kainan sa malapit. Kung may kailangan kayo, magpadala lang ng request at aasikasuhin namin.'
      ),
      checkInTime: '14:00',
      checkOutTime: '11:00',
      doorCode: '4826#',
      wifi: { ssid: 'HarborSuite_5G', password: 'welcome2stay' },
      mapUrl: mapsSearch('Mactan, Lapu-Lapu City, Cebu'),
      reviewUrl: 'https://www.airbnb.com/',
      requireId: true,
      selfCheckIn: [
        { title: bi('Arrive at the building', 'Pagdating sa gusali'), text: bi('Tell the guard you are a guest of Unit 1208. Show your booking name.', 'Sabihin sa guard na bisita kayo ng Unit 1208. Ipakita ang pangalan ng booking.'), image: '' },
        { title: bi('Take the elevator to the 12th floor', 'Sumakay ng elevator papuntang 12th floor'), text: bi('Turn right after exiting the elevator. Unit 1208 is the third door on the left.', 'Kumanan paglabas ng elevator. Ang Unit 1208 ay ikatlong pinto sa kaliwa.'), image: '' },
        { title: bi('Unlock the smart lock', 'Buksan ang smart lock'), text: bi('Touch the keypad to wake it up, then enter your door code shown below.', 'Hawakan ang keypad para gumana, saka ilagay ang door code na nasa ibaba.'), image: '' },
      ],
      rules: [
        bi('Check-in from 2:00 PM, check-out by 11:00 AM.', 'Check-in mula 2:00 PM, check-out bago mag-11:00 AM.'),
        bi('No smoking or vaping inside the unit.', 'Bawal manigarilyo o mag-vape sa loob ng unit.'),
        bi('Quiet hours from 10:00 PM to 7:00 AM.', 'Tahimik na oras mula 10:00 PM hanggang 7:00 AM.'),
        bi('No parties or events. Registered guests only.', 'Bawal ang party o event. Mga rehistradong bisita lamang.'),
        bi('Please turn off the aircon and lights when you go out.', 'Pakipatay ang aircon at ilaw kapag aalis.'),
      ],
      appliances: [
        { name: bi('Air conditioner', 'Aircon'), steps: bi('Use the white remote on the bedside table.\nPress POWER, then set to COOL at 24°C for the best comfort.\nPlease close windows while the aircon is on.', 'Gamitin ang puting remote sa tabi ng kama.\nPindutin ang POWER, saka i-set sa COOL, 24°C.\nPakisara ang bintana habang naka-on ang aircon.'), image: '' },
        { name: bi('Smart TV & Netflix', 'Smart TV at Netflix'), steps: bi('Press the red button on the remote.\nNetflix is already signed in — choose the "Guest" profile.\nPlease sign out of your personal accounts before check-out.', 'Pindutin ang pulang button sa remote.\nNaka-sign in na ang Netflix — piliin ang "Guest" profile.\nPaki-sign out ang inyong personal na account bago mag-check-out.'), image: '' },
        { name: bi('Water heater', 'Water heater'), steps: bi('Switch on the heater on the bathroom wall (red light turns on).\nWait about 1 minute for warm water.\nTurn it off after use.', 'I-on ang heater sa dingding ng banyo (iilaw ang pula).\nMaghintay ng mga 1 minuto para uminit ang tubig.\nPatayin pagkatapos gamitin.'), image: '' },
      ],
      localGuide: [
        { category: bi('Food', 'Pagkain'), name: 'Seafood Paluto Restaurants', desc: bi('Pick fresh seafood and have it cooked your way. A must-try in Mactan.', 'Pumili ng sariwang seafood at ipaluto ayon sa gusto ninyo. Dapat subukan sa Mactan.'), mapUrl: mapsSearch('Seafood paluto Mactan'), image: '' },
        { category: bi('Food', 'Pagkain'), name: 'Coffee shops nearby', desc: bi('Cozy cafés within a short walk for breakfast and work.', 'Mga maaliwalas na café na malapit lang para sa almusal at trabaho.'), mapUrl: mapsSearch('cafe Mactan Lapu-Lapu'), image: '' },
        { category: bi('Sights', 'Pasyalan'), name: 'Mactan Shrine (Liberty Shrine)', desc: bi('Historic site honoring Lapulapu, by the sea.', 'Makasaysayang lugar bilang parangal kay Lapulapu, tabi ng dagat.'), mapUrl: mapsSearch('Mactan Shrine Lapu-Lapu'), image: '' },
        { category: bi('Activities', 'Aktibidad'), name: 'Island hopping', desc: bi('Day trips to Nalusuan, Hilutungan and Pandanon. Ask us to book one for you.', 'Day trip sa Nalusuan, Hilutungan at Pandanon. Puwede naming i-book para sa inyo.'), mapUrl: mapsSearch('Island hopping Mactan'), image: '' },
        { category: bi('Essentials', 'Mahahalaga'), name: 'Pharmacy & convenience store', desc: bi('24/7 options a few minutes away.', '24/7 na bukas, ilang minuto lang ang layo.'), mapUrl: mapsSearch('pharmacy near Mactan Lapu-Lapu'), image: '' },
        { category: bi('Transport', 'Transportasyon'), name: 'Mactan-Cebu International Airport', desc: bi('About 15–25 minutes by car depending on traffic. Grab is widely available.', 'Mga 15–25 minuto sakay ng kotse depende sa trapiko. Maraming Grab sa lugar.'), mapUrl: mapsSearch('Mactan-Cebu International Airport'), image: '' },
      ],
      services: [
        { name: bi('Airport transfer', 'Airport transfer'), desc: bi('Private car pick-up or drop-off at Mactan-Cebu International Airport.', 'Pribadong sasakyan para sa pagsundo o paghatid sa airport.'), price: 600, unit: bi('per trip', 'bawat biyahe'), image: '' },
        { name: bi('Breakfast basket', 'Breakfast basket'), desc: bi('Fresh bread, fruit, coffee and juice delivered to your door.', 'Sariwang tinapay, prutas, kape at juice na ihahatid sa pinto.'), price: 350, unit: bi('per person', 'bawat tao'), image: '' },
        { name: bi('Laundry service', 'Laundry service'), desc: bi('Wash, dry and fold. Returned within 24 hours.', 'Laba, patuyo at tupi. Ibabalik sa loob ng 24 oras.'), price: 250, unit: bi('per load', 'bawat load'), image: '' },
        { name: bi('Island hopping tour', 'Island hopping tour'), desc: bi('Full-day boat tour with snorkeling and lunch.', 'Buong araw na boat tour na may snorkeling at tanghalian.'), price: 2500, unit: bi('per person', 'bawat tao'), image: '' },
        { name: bi('Motorbike rental', 'Motorbike rental'), desc: bi('Scooter with helmet. Valid driver\'s license required.', 'Scooter na may helmet. Kailangan ng lisensya.'), price: 500, unit: bi('per day', 'bawat araw'), image: '' },
      ],
      requestItems: [bi('Extra towels', 'Dagdag na tuwalya'), bi('Toiletries', 'Toiletries'), bi('Drinking water', 'Inuming tubig'), bi('Extra pillow / blanket', 'Dagdag na unan / kumot'), bi('Toilet paper', 'Tissue'), bi('Kitchen supplies', 'Gamit sa kusina')],
      issueTypes: [bi('Aircon', 'Aircon'), bi('Plumbing / water', 'Tubo / tubig'), bi('Electricity', 'Kuryente'), bi('Wi-Fi / TV', 'Wi-Fi / TV'), bi('Door lock', 'Lock ng pinto'), bi('Noise', 'Ingay'), bi('Cleanliness', 'Kalinisan'), bi('Other', 'Iba pa')],
      housekeepingOptions: [bi('Full cleaning', 'Buong paglilinis'), bi('Towel & linen change', 'Palit ng tuwalya at kobre-kama'), bi('Trash pick-up only', 'Kuha ng basura lamang')],
      housekeepingSlots: ['9:00 AM – 11:00 AM', '1:00 PM – 3:00 PM', '3:00 PM – 5:00 PM'],
      stayPolicy: bi(
        'Early check-in and late checkout depend on availability. A small fee may apply. We will confirm as soon as possible.',
        'Ang maagang check-in at late checkout ay depende sa availability. Maaaring may maliit na bayad. Kukumpirmahin namin agad.'
      ),
      emergency: [
        { label: bi('National emergency hotline', 'National emergency hotline'), phone: '911', mapUrl: '' },
        { label: bi('Building security / guard', 'Security / guard ng gusali'), phone: '+63 900 000 0001', mapUrl: '' },
        { label: bi('Nearest hospital', 'Pinakamalapit na ospital'), phone: '', mapUrl: mapsSearch('hospital near Mactan Lapu-Lapu') },
        { label: bi('Nearest pharmacy', 'Pinakamalapit na botika'), phone: '', mapUrl: mapsSearch('pharmacy near Mactan Lapu-Lapu') },
      ],
      trash: bi(
        'Please separate biodegradable (food waste) and non-biodegradable (plastic, cans) trash.\nBins are under the kitchen sink. Extra bags are in the drawer beside it.\nGarbage chute is beside the elevator on every floor — open daily.\nCollection days for the building: Monday, Wednesday and Friday.',
        'Pakihiwalay ang nabubulok (tirang pagkain) at hindi nabubulok (plastik, lata).\nNasa ilalim ng lababo ang basurahan. May dagdag na supot sa drawer sa tabi nito.\nAng garbage chute ay nasa tabi ng elevator sa bawat palapag — bukas araw-araw.\nAraw ng koleksyon: Lunes, Miyerkules at Biyernes.'
      ),
      checkoutChecklist: [
        bi('Turn off the aircon, lights and water heater', 'Patayin ang aircon, ilaw at water heater'),
        bi('Put used towels in the bathroom', 'Ilagay ang gamit na tuwalya sa banyo'),
        bi('Take out the trash', 'Itapon ang basura'),
        bi('Wash or leave used dishes in the sink', 'Hugasan o iwan sa lababo ang gamit na pinggan'),
        bi('Close all windows and lock the door', 'Isara ang mga bintana at i-lock ang pinto'),
      ],
    }],
    bookings: [{
      id: 'b_demo',
      code: 'HARBOR1',
      propertyId: 'p_harbor',
      guestName: 'Maria Santos',
      checkIn: today,
      checkOut: addDays(today, 3),
      guests: 2,
      notes: 'Demo booking',
      status: 'upcoming',
      checkInData: null,
      feedback: null,
      createdAt: Date.now(),
    }],
    requests: [],
    notifications: [],
    guestbook: [{
      id: 'g_seed', propertyId: 'p_harbor', name: 'Ana & Paolo', text: 'Lovely place, spotless and so close to everything. The breakfast basket was a treat!', status: 'approved', createdAt: Date.now() - 86400000 * 9,
    }],
  };
}

const Store = (() => {
  const KEY = 'guestportal_data_v1';
  const subs = [];
  let data = read();

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through to seed */ }
    const d = seedData();
    write(d);
    return d;
  }
  function write(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); return true; }
    catch (e) {
      toast('Storage is full. Use smaller photos or remove some images. A live server removes this limit.', 'err');
      return false;
    }
  }
  function emit(source) { subs.forEach(fn => { try { fn(source); } catch (e) { console.error(e); } }); }

  window.addEventListener('storage', e => {
    if (e.key === KEY) { data = read(); emit('remote'); }
  });

  const api = {
    get: () => data,
    subscribe(fn) { subs.push(fn); },
    /* Mutate via callback, persist, notify this tab's listeners. */
    update(fn) {
      const backup = JSON.stringify(data);
      fn(data);
      if (!write(data)) { data = JSON.parse(backup); return false; }
      emit('local');
      return true;
    },
    replaceAll(newData) { data = newData; write(data); emit('local'); },
    reset() { data = seedData(); write(data); emit('local'); },

    property: id => data.properties.find(p => p.id === id),
    booking: id => data.bookings.find(b => b.id === id),
    bookingByCode: code => data.bookings.find(b => b.code.toUpperCase() === String(code || '').trim().toUpperCase()),
    request: id => data.requests.find(r => r.id === id),

    notify(text, refs = {}) {
      data.notifications.unshift({ id: uid('n'), text, read: false, at: Date.now(), ...refs });
      data.notifications = data.notifications.slice(0, 200);
    },

    addRequest(bookingId, req) {
      let created;
      api.update(d => {
        const b = d.bookings.find(x => x.id === bookingId);
        const p = d.properties.find(x => x.id === b.propertyId);
        created = {
          id: uid('r'), bookingId, propertyId: b.propertyId, guestName: b.guestName,
          type: req.type, title: req.title || '', details: req.details || '', meta: req.meta || {},
          photo: req.photo || '', status: 'new', replies: [], createdAt: Date.now(), updatedAt: Date.now(),
        };
        d.requests.unshift(created);
        api.notify(`${b.guestName} · ${p.name.en}: ${REQUEST_TYPES[req.type]} — ${created.title}`, { requestId: created.id, bookingId, kind: req.type });
      });
      return created;
    },

    addReply(requestId, from, text) {
      api.update(d => {
        const r = d.requests.find(x => x.id === requestId);
        r.replies.push({ from, text, at: Date.now() });
        r.updatedAt = Date.now();
        if (from === 'guest') api.notify(`${r.guestName} replied: "${text.slice(0, 80)}"`, { requestId, bookingId: r.bookingId, kind: 'message' });
      });
    },

    setStatus(requestId, status) {
      api.update(d => {
        const r = d.requests.find(x => x.id === requestId);
        r.status = status; r.updatedAt = Date.now();
      });
    },
  };
  return api;
})();

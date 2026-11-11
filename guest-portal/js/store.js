/* Data layer.
 * Demo mode keeps everything in localStorage, and the browser "storage" event
 * syncs open tabs live (guest tab -> admin tab notifications and back).
 * To go live, replace load/save/subscribe with a real backend (e.g. Supabase)
 * while keeping the same Store API used by guest.js and admin.js.
 */

const REQUEST_TYPES = {
  request: 'Item request',
  issue: 'Issue report',
  service: 'Extra / service',
  early_checkin: 'Early check-in',
  late_checkout: 'Late checkout',
  extend_stay: 'Extend stay',
  housekeeping: 'Housekeeping',
  lost_found: 'Lost & found',
  luggage: 'Luggage storage',
};
const STATUSES = ['new', 'in_progress', 'approved', 'declined', 'done'];
const STATUS_LABEL = { new: 'New', in_progress: 'In progress', approved: 'Approved', declined: 'Declined', done: 'Done' };

const bi = (en, fil, more) => ({ en, fil: fil == null ? en : fil, ...(more || {}) });
const tile = (target, icon, color, t, s) => ({ target, icon, color, title: t, sub: s });
const step = (en, txt, fil, filTxt) => ({ title: bi(en, fil), text: bi(txt, filTxt), image: '', video: '' });
const gmap = q => mapsSearch(q + ', Baguio City');

function seedData() {
  const today = ymd();
  return {
    version: 3,
    settings: {
      brandName: 'Casa Serena Stays',
      tagline: bi('Your home away from home', 'Ang iyong tahanan malayo sa tahanan'),
      hostName: 'Your Host',
      hostPhone: '+63 900 000 0000',
      hostEmail: 'host@example.com',
      currency: '₱',
      adminPin: '1234',
      accent: '#1f2a44',
      languages: { fil: false, ko: true, ja: true, zh: false },
      askEnglish: true,
      requireIdApproval: true,
      quickReplies: [
        'Noted! We will take care of it shortly.',
        'On the way — should be there within 30 minutes.',
        'Approved. See you then!',
        'Sorry, that is not available for those dates.',
        'All done. Let us know if you need anything else.',
      ],
    },
    properties: [{
      id: 'p_pines',
      name: bi('The Pines Suite'),
      welcomeLine: bi('Welcome to our home', 'Maligayang pagdating', { ko: '저희 집에 오신 것을 환영합니다', ja: 'ようこそ', zh: '欢迎回家' }),
      tagline: bi('Your cozy escape in the City of Pines.', 'Ang maaliwalas ninyong pahingahan sa City of Pines.', { ko: '소나무의 도시에서 보내는 아늑한 휴식.', ja: '松の街での居心地のよい滞在。', zh: '松树之城里的温馨小憩。' }),
      location: 'Baguio City, Benguet',
      address: 'Baguio City, Benguet',
      heroImage: '',
      checkInTime: '14:00',
      checkOutTime: '12:00',
      unlockHours: 48,
      hostUnlock: 'checkin',
      doorCode: '4826#',
      wifi: { ssid: 'PinesSuite_5G', password: 'welcome2baguio' },
      wifiNote: bi('Connect to the 5G network for the fastest speed. The router is beside the TV.', 'Kumonekta sa 5G network para sa pinakamabilis na koneksyon. Ang router ay nasa tabi ng TV.'),
      hostNote: bi('Message or call me anytime during your stay.', 'Mag-message o tumawag anumang oras habang kayo ay naririto.'),
      mapUrl: gmap('Session Road'),
      reviewUrl: 'https://www.airbnb.com/',
      requireId: true,
      extrasCover: '',

      homeSections: [
        { title: bi('Quick access', 'Mabilisang access', { ko: '빠른 이용', ja: 'クイックアクセス', zh: '快速访问' }), tiles: [
          tile('wifi', 'wifi', 'green', bi('Wi-Fi', null, { ko: '와이파이', ja: 'Wi-Fi', zh: 'Wi-Fi' }), bi('Password and QR', 'Password at QR', { ko: '비밀번호와 QR', ja: 'パスワードとQR', zh: '密码和二维码' })),
          tile('p-door', 'key', 'beige', bi('Door access', 'Pagpasok sa pinto', { ko: '출입 안내', ja: 'ドアの開け方', zh: '开门方式' }), bi('Keycard and code', 'Keycard at code', { ko: '카드키와 비밀번호', ja: 'カードキーと暗証番号', zh: '门卡和密码' })),
          tile('p-parking', 'car', 'beige', bi('Parking', null, { ko: '주차', ja: '駐車場', zh: '停车' }), bi('Where to park', 'Saan magpaparada', { ko: '주차 위치', ja: '駐車場所', zh: '停车位置' })),
          tile('checkout', 'check', 'yellow', bi('Checkout', null, { ko: '체크아웃', ja: 'チェックアウト', zh: '退房' }), bi('Final checklist', 'Huling checklist', { ko: '최종 체크리스트', ja: '最終チェック', zh: '退房清单' })),
        ] },
        { title: bi('Settle in', 'Pag-aayos', { ko: '편하게 지내기', ja: 'お部屋のご案内', zh: '入住指南' }), tiles: [
          tile('p-warm', 'flame', 'yellow', bi('Staying warm', 'Pampainit'), bi('Heater and blankets', 'Heater at kumot')),
          tile('p-tv', 'tv', 'lavender', bi('TV & apps'), bi('Remote and apps', 'Remote at apps')),
          tile('p-sofa', 'sofa', 'mint', bi('Sofa bed'), bi('Sleep setup', 'Paghahanda sa pagtulog')),
          tile('p-trash', 'trash', 'mint', bi('Trash', 'Basura'), bi('Disposal guide', 'Gabay sa pagtapon')),
        ] },
        { title: bi('Explore Baguio', 'Libutin ang Baguio', { ko: '바기오 둘러보기', ja: 'バギオを楽しむ', zh: '探索碧瑶' }), tiles: [
          tile('guide', 'pin', 'sage', bi('Things to do', 'Mga gagawin'), bi('Parks, food, markets', 'Parke, kainan, palengke')),
          tile('extras', 'sparkle', 'beige', bi('Tours & extras'), bi('Trips, transfers, pasalubong', 'Tour, sundo, pasalubong')),
          tile('p-weather', 'snowflake', 'lavender', bi('Weather & roads', 'Panahon at daan'), bi('Fog, rain, what to wear', 'Hamog, ulan, isusuot')),
          tile('rules', 'lock', 'yellow', bi('House rules', 'Patakaran'), bi('Visitors and quiet hours', 'Bisita at tahimik na oras')),
        ] },
      ],
      features: [
        { target: 'guide', image: '', eyebrow: bi('Parks, markets, cafés'), title: bi('Must-do in Baguio', 'Dapat gawin sa Baguio'), text: bi('Burnham Park, Mines View, Camp John Hay, the night market and the best strawberry taho.', 'Burnham Park, Mines View, Camp John Hay, night market at strawberry taho.'), button: bi('See the list', 'Tingnan') },
        { target: 'extras', image: '', eyebrow: bi('Tours, transfers, pasalubong'), title: bi('Tours & extras'), text: bi('Bus terminal pickup, city and strawberry farm tours, Sagada trips and pasalubong pre-orders.', 'Sundo sa bus terminal, city tour, strawberry farm, Sagada at pasalubong.'), button: bi('Browse extras', 'Tingnan ang extras') },
      ],
      panels: [
        { eyebrow: bi('Settle in', 'Pag-aayos'), title: bi('During your stay', 'Habang naririto'), text: bi('Stay warm and comfortable, from chilly nights to movie time and hot showers.', 'Manatiling mainit at komportable, mula malamig na gabi hanggang mainit na shower.'), tiles: [
          tile('p-warm', 'flame', 'navy', bi('Staying warm', 'Pampainit'), bi('Heater, blankets, hot drinks', 'Heater, kumot, mainit na inumin')),
          tile('p-shower', 'droplet', 'beige', bi('Hot shower'), bi('Water heater and temperature', 'Water heater at temperatura')),
          tile('p-kitchen', 'utensils', 'beige', bi('Kitchen guides', 'Gabay sa kusina'), bi('Induction cooker, kettle, rice cooker', 'Induction, kettle, rice cooker')),
          tile('p-tv', 'tv', 'beige', bi('TV & apps'), bi('Netflix, YouTube and more', 'Netflix, YouTube at iba pa')),
        ] },
        { eyebrow: bi('Concierge desk'), title: bi('Need help?', 'Kailangan ng tulong?'), text: bi('Simple support when something feels unclear or urgent.', 'Madaling tulong kapag may hindi malinaw o urgent.'), tiles: [
          tile('host', 'phone', 'navy', bi('Host contact'), bi('Reach me anytime during your stay', 'Kontakin ako anumang oras')),
          tile('help', 'message', 'beige', bi('Request or report', 'Request o report'), bi('Items, issues and photos', 'Gamit, problema at litrato')),
          tile('housekeeping', 'concierge', 'beige', bi('Cleaning', 'Paglilinis'), bi('Refresh service for longer stays', 'Paglilinis para sa mahabang stay')),
          tile('problems', 'help', 'beige', bi('Common problems', 'Karaniwang problema'), bi('Lock, Wi-Fi, TV, heater', 'Lock, Wi-Fi, TV, heater')),
        ] },
      ],

      pages: [
        { id: 'door', icon: 'key', category: bi('Arrival', 'Pagdating'), title: bi('Door access', 'Pagpasok sa pinto'), summary: bi('Use the keycard first. The door code is a backup if the keycard is not with you.', 'Gamitin muna ang keycard. Pang-backup ang door code.'), cover: '', inTutorials: true, private: false, showDoorCode: true, video: '',
          infoCards: [], lists: [], gallery: [],
          steps: [
            step('Arrive at the building', 'Tell the guard you are a guest of Unit 508 and show your booking code.', 'Pagdating sa gusali', 'Sabihin sa guard na bisita kayo ng Unit 508 at ipakita ang booking code.'),
            step('Go to the 5th floor', 'Turn left after the elevator. Unit 508 is at the end of the hallway.', 'Pumunta sa 5th floor', 'Kumaliwa paglabas ng elevator. Nasa dulo ng pasilyo ang Unit 508.'),
            step('Unlock the door', 'Tap the keycard on the lock. No keycard? Touch the keypad to wake it, then enter your door code.', 'Buksan ang pinto', 'I-tap ang keycard sa lock. Walang keycard? Hawakan ang keypad at ilagay ang door code.'),
          ] },
        { id: 'warm', icon: 'flame', category: bi('Comfort'), title: bi('Staying warm', 'Pampainit'), summary: bi('Baguio nights can drop to 12–15°C, colder from December to February.', 'Puwedeng bumaba sa 12–15°C ang gabi sa Baguio, mas malamig Disyembre hanggang Pebrero.'), cover: '', inTutorials: true, private: false, showDoorCode: false, video: '',
          infoCards: [{ label: bi('Extra blankets', 'Dagdag na kumot'), text: bi('In the top shelf of the bedroom closet.', 'Nasa itaas na estante ng aparador sa kwarto.'), image: '', video: '' }],
          lists: [{ title: bi('Tips', 'Mga tip'), tone: 'sage', items: bi('Close the windows before sunset to keep warm air in.\nWear socks — the floors get cold at night.\nAsk us for an extra space heater if you need one.', 'Isara ang bintana bago lumubog ang araw.\nMagmedyas — malamig ang sahig sa gabi.\nMag-request ng dagdag na heater kung kailangan.') }],
          gallery: [],
          steps: [
            step('Turn on the space heater', 'It is beside the sofa. Switch it on and choose LOW or HIGH.', 'I-on ang heater', 'Nasa tabi ng sofa. I-on at piliin ang LOW o HIGH.'),
            step('Keep it safe', 'Keep it 1 meter away from curtains and blankets. Switch it off when you go out or sleep.', 'Ligtas na paggamit', 'Ilayo ng 1 metro sa kurtina at kumot. Patayin kapag aalis o matutulog.'),
          ] },
        { id: 'sofa', icon: 'sofa', category: bi('Sleeping', 'Pagtulog'), title: bi('Sofa bed'), summary: bi('Switch between lounge mode and a flat bed in a minute.', 'Palitan mula sofa papuntang kama sa isang minuto.'), cover: '', inTutorials: true, private: false, showDoorCode: false, video: '',
          infoCards: [], lists: [], gallery: [],
          steps: [
            step('Clear the seat', 'Remove pillows, throws and personal items before opening the bed.', 'Linisin ang upuan', 'Alisin ang unan, kumot at gamit bago buksan.'),
            step('Pull out the frame', 'Hold the front bar and pull it toward you in one smooth motion.', 'Hilahin ang frame', 'Hawakan ang harapang bar at hilahin nang dahan-dahan.'),
            step('Set night mode', 'Fold the legs down, make sure the bed is supported, and lay the mattress flat.', 'Night mode', 'Ibaba ang mga paa at ilatag ang kutson.'),
            step('Return to sofa mode', 'Lift the foot slightly, fold the legs in, and push the frame back until it locks.', 'Ibalik sa sofa', 'Iangat nang kaunti, itiklop ang paa, at itulak pabalik hanggang mag-lock.'),
          ] },
        { id: 'tv', icon: 'tv', category: bi('Appliances'), title: bi('TV & apps'), summary: bi('Use the remote, switch apps, and see which streaming accounts are provided.', 'Gamitin ang remote at alamin kung aling streaming account ang kasama.'), cover: '', inTutorials: true, private: false, showDoorCode: false, video: '',
          infoCards: [{ label: bi('Included', 'Kasama'), text: bi('Netflix (Guest profile) and YouTube. Please sign out of personal accounts before checkout.', 'Netflix (Guest profile) at YouTube. Paki-sign out ang personal na account bago mag-checkout.'), image: '', video: '' }],
          lists: [], gallery: [],
          steps: [
            step('Turn on', 'Press the red power button on the remote.', 'I-on', 'Pindutin ang pulang power button sa remote.'),
            step('Open an app', 'Press the Home button and pick Netflix or YouTube.', 'Magbukas ng app', 'Pindutin ang Home at piliin ang Netflix o YouTube.'),
          ] },
        { id: 'kitchen', icon: 'utensils', category: bi('Kitchen', 'Kusina'), title: bi('Kitchen guides', 'Gabay sa kusina'), summary: bi('Induction cooker, electric kettle and rice cooker.', 'Induction cooker, electric kettle at rice cooker.'), cover: '', inTutorials: true, private: false, showDoorCode: false, video: '',
          infoCards: [], gallery: [],
          lists: [{ title: bi('Cook safely', 'Ligtas na pagluluto'), tone: 'sage', items: bi('Use flat-bottom pans on the induction cooker.\nTurn on the exhaust fan while cooking.\nNever leave cooking unattended.', 'Gumamit ng flat na kawali sa induction.\nI-on ang exhaust habang nagluluto.\nHuwag iwanan ang niluluto.') }],
          steps: [
            step('Induction cooker', 'Press power, place the pan, then choose the heat level with + and –.', 'Induction cooker', 'Pindutin ang power, ilagay ang kawali, at piliin ang init gamit ang + at –.'),
            step('Electric kettle', 'Fill with water up to the MAX line and press the switch. Perfect for coffee on cold mornings.', 'Electric kettle', 'Punuin hanggang MAX at pindutin ang switch.'),
            step('Rice cooker', 'One cup of rice to 1¼ cups of water. Press COOK; it switches to WARM when done.', 'Rice cooker', 'Isang tasang bigas sa 1¼ tasang tubig. Pindutin ang COOK.'),
          ] },
        { id: 'shower', icon: 'droplet', category: bi('Bathroom', 'Banyo'), title: bi('Hot shower'), summary: bi('Water heater, temperature control and quick fixes.', 'Water heater, temperatura at mabilis na solusyon.'), cover: '', inTutorials: true, private: false, showDoorCode: false, video: '',
          infoCards: [], lists: [], gallery: [],
          steps: [
            step('Switch on the heater', 'Turn on the heater switch on the bathroom wall. The red light turns on.', 'I-on ang heater', 'I-on ang switch sa dingding ng banyo. Iilaw ang pula.'),
            step('Wait one minute', 'Give the water about a minute to warm up.', 'Maghintay ng isang minuto', 'Hayaang uminit ang tubig ng isang minuto.'),
            step('Adjust the temperature', 'Turn the knob left for warmer, right for cooler. Switch the heater off after use.', 'I-adjust ang temperatura', 'Ipihit pakaliwa para mas mainit. Patayin pagkatapos.'),
          ] },
        { id: 'weather', icon: 'snowflake', category: bi('Good to know', 'Mabuting malaman'), title: bi('Weather & roads', 'Panahon at daan'), summary: bi('Cool all year, foggy afternoons, and a rainy season from June to October.', 'Malamig buong taon, mahamog sa hapon, at tag-ulan mula Hunyo hanggang Oktubre.'), cover: '', inTutorials: false, private: false, showDoorCode: false, video: '',
          infoCards: [
            { label: bi('Temperature', 'Temperatura'), text: bi('Usually 15–24°C. Coldest from December to February.', 'Karaniwang 15–24°C. Pinakamalamig Disyembre hanggang Pebrero.'), image: '', video: '' },
            { label: bi('Rainy season', 'Tag-ulan'), text: bi('June to October. Typhoons can close Kennon Road and Marcos Highway — check before you travel.', 'Hunyo hanggang Oktubre. Maaaring isara ang Kennon Road at Marcos Highway kapag may bagyo.'), image: '', video: '' },
            { label: bi('Fog', 'Hamog'), text: bi('Thick fog often rolls in after lunch. Drive slowly with low beams on.', 'Madalas mahamog pagkatapos ng tanghalian. Magmaneho nang dahan-dahan.'), image: '', video: '' },
          ],
          lists: [{ title: bi('What to pack', 'Dalhin'), tone: 'plain', items: bi('A jacket or hoodie for the evenings.\nAn umbrella, especially June to October.\nComfortable shoes — Baguio has many hills and stairs.', 'Jacket o hoodie para sa gabi.\nPayong, lalo na Hunyo hanggang Oktubre.\nKomportableng sapatos — maraming paakyat sa Baguio.') }],
          gallery: [], steps: [] },
        { id: 'trash', icon: 'trash', category: bi('Housekeeping'), title: bi('Trash disposal', 'Pagtapon ng basura'), summary: bi('Baguio separates waste strictly. Here is where everything goes.', 'Mahigpit ang paghihiwalay ng basura sa Baguio.'), cover: '', inTutorials: false, private: false, showDoorCode: false, video: '',
          infoCards: [],
          gallery: [
            { image: '', video: '', caption: bi('Start near the service elevator', 'Magsimula malapit sa service elevator') },
            { image: '', video: '', caption: bi('Walk toward the exit sign', 'Maglakad papunta sa exit sign') },
            { image: '', video: '', caption: bi('Garbage room door', 'Pinto ng garbage room') },
          ],
          lists: [
            { title: bi('Separate your trash', 'Ihiwalay ang basura'), tone: 'sage', items: bi('Green bin: food scraps and other biodegradables.\nBlue bin: plastic, cans and bottles (rinsed).\nBlack bin: everything else.', 'Berde: tirang pagkain.\nAsul: plastik, lata at bote (hinugasan).\nItim: iba pa.') },
            { title: bi('When bins are full', 'Kapag puno'), tone: 'plain', items: bi('Tie the bag and bring it to the garbage room on this floor.\nDo not leave trash in the hallway.', 'Itali ang supot at dalhin sa garbage room.\nHuwag iwan sa pasilyo.') },
          ],
          steps: [] },
        { id: 'parking', icon: 'car', category: bi('Arrival', 'Pagdating'), title: bi('Parking'), summary: bi('Where to park and how to get a pass.', 'Saan magparada at paano kumuha ng pass.'), cover: '', inTutorials: false, private: true, showDoorCode: false, video: '',
          infoCards: [
            { label: bi('Slot', 'Puwesto'), text: bi('Basement 1, slot B1-12.'), image: '', video: '' },
            { label: bi('Parking pass'), text: bi('Show your booking code at the guard house to get a temporary pass.', 'Ipakita ang booking code sa guard house para sa pansamantalang pass.'), image: '', video: '' },
            { label: bi('Steep driveway', 'Matarik na daan'), text: bi('Use first gear going down the ramp, and use the handbrake when parked.', 'Gumamit ng primera pababa ng ramp at i-handbrake kapag nakaparada.'), image: '', video: '' },
          ],
          lists: [], gallery: [], steps: [] },
      ],

      rules: [
        bi('Check-in from 2:00 PM, checkout by 12:00 noon.', 'Check-in mula 2:00 PM, checkout bago mag-12:00 ng tanghali.'),
        bi('No smoking or vaping inside the unit.', 'Bawal manigarilyo o mag-vape sa loob ng unit.'),
        bi('Quiet hours from 10:00 PM to 7:00 AM.', 'Tahimik na oras mula 10:00 PM hanggang 7:00 AM.'),
        bi('Visitors must be registered at the lobby. No parties or events.', 'Kailangang irehistro ang bisita sa lobby. Bawal ang party.'),
        bi('Switch off the heater and lights when you go out, and close the windows when it rains.', 'Patayin ang heater at ilaw kapag aalis, at isara ang bintana kapag umuulan.'),
      ],
      localGuide: [
        { category: bi('Sights', 'Pasyalan'), name: 'Burnham Park', desc: bi('The heart of the city. Rent a rowboat on the lake or a bike around the park.', 'Ang puso ng lungsod. Mag-bangka sa lawa o mag-bisikleta.'), mapUrl: gmap('Burnham Park'), image: '' },
        { category: bi('Sights', 'Pasyalan'), name: 'Mines View Park', desc: bi('Lookout over the Itogon mountains and Amburayan Valley, with pasalubong stalls.', 'Tanawin ng kabundukan ng Itogon at pasalubong stalls.'), mapUrl: gmap('Mines View Park'), image: '' },
        { category: bi('Sights', 'Pasyalan'), name: 'The Mansion & Wright Park', desc: bi('Photo stop at the summer palace gates, then horseback riding at Wright Park across the road.', 'Litrato sa The Mansion, saka mangabayo sa Wright Park.'), mapUrl: gmap('The Mansion'), image: '' },
        { category: bi('Nature', 'Kalikasan'), name: 'Camp John Hay', desc: bi('Pine forest walks on the Yellow Trail (about 1.5 km), Tree Top Adventure and cafés.', 'Lakad sa pine forest (Yellow Trail), Tree Top Adventure at mga café.'), mapUrl: gmap('Camp John Hay'), image: '' },
        { category: bi('Nature', 'Kalikasan'), name: 'Mirador Heritage & Eco-Spirituality Park', desc: bi('Japanese-inspired garden with a torii gate and city views, near Lourdes Grotto.', 'Hardin na may torii gate at tanawin ng lungsod.'), mapUrl: gmap('Mirador Heritage and Eco-Spirituality Park'), image: '' },
        { category: bi('Art & culture', 'Sining at kultura'), name: 'BenCab Museum', desc: bi('Contemporary Filipino art, Cordillera artifacts and a garden café. On Asin Road, Tuba.', 'Sining Pilipino at Cordillera artifacts. Sa Asin Road, Tuba.'), mapUrl: mapsSearch('BenCab Museum, Tuba, Benguet'), image: '' },
        { category: bi('Art & culture', 'Sining at kultura'), name: 'Tam-awan Village', desc: bi('Traditional Ifugao and Kalinga huts with local artists and workshops.', 'Tradisyonal na bahay ng Ifugao at Kalinga at mga lokal na artist.'), mapUrl: gmap('Tam-awan Village'), image: '' },
        { category: bi('Food', 'Pagkain'), name: 'Session Road', desc: bi('The main street for cafés, bakeries and restaurants. Closed to cars on some Sundays.', 'Pangunahing kalye ng café at kainan.'), mapUrl: gmap('Session Road'), image: '' },
        { category: bi('Food', 'Pagkain'), name: 'Café by the Ruins', desc: bi('A Baguio classic for local dishes and fresh bread.', 'Klasikong kainan sa Baguio.'), mapUrl: gmap('Cafe by the Ruins'), image: '' },
        { category: bi('Food', 'Pagkain'), name: 'Choco-late de Batirol', desc: bi('Traditional hot chocolate in a garden setting at Camp John Hay.', 'Tradisyonal na tsokolate sa Camp John Hay.'), mapUrl: gmap('Choco-late de Batirol Camp John Hay'), image: '' },
        { category: bi('Shopping', 'Pamimili'), name: 'Baguio Night Market', desc: bi('Ukay-ukay and street food along Harrison Road, every night.', 'Ukay-ukay at street food sa Harrison Road gabi-gabi.'), mapUrl: gmap('Baguio Night Market Harrison Road'), image: '' },
        { category: bi('Shopping', 'Pamimili'), name: 'Baguio City Public Market', desc: bi('Strawberry jam, peanut brittle, coffee and fresh highland vegetables.', 'Strawberry jam, peanut brittle, kape at gulay.'), mapUrl: gmap('Baguio City Public Market'), image: '' },
        { category: bi('Shopping', 'Pamimili'), name: 'Good Shepherd Convent', desc: bi('Famous ube jam and pasalubong made by the Good Shepherd sisters.', 'Sikat na ube jam at pasalubong.'), mapUrl: gmap('Good Shepherd Convent'), image: '' },
        { category: bi('Day trips', 'Day trip'), name: 'Strawberry Farm, La Trinidad', desc: bi('Pick your own strawberries in season (about November to May) and try strawberry taho.', 'Mamitas ng strawberry (Nobyembre–Mayo) at tikman ang strawberry taho.'), mapUrl: mapsSearch('Strawberry Farm, La Trinidad, Benguet'), image: '' },
        { category: bi('Day trips', 'Day trip'), name: 'Valley of Colors, La Trinidad', desc: bi('A hillside of houses painted as one giant mural.', 'Mga bahay na pininturahan bilang isang malaking mural.'), mapUrl: mapsSearch('Valley of Colors, La Trinidad, Benguet'), image: '' },
      ],
      services: [
        { icon: 'car', category: bi('Transport'), tag: bi('Partner service'), name: bi('Bus terminal pickup or drop-off'), desc: bi('A car to or from the Victory Liner or Joy Bus terminal, with help for your bags.', 'Sundo o hatid sa Victory Liner o Joy Bus terminal.'), priceText: bi('From ₱300 per trip', 'Mula ₱300 bawat biyahe'), note: bi('Send your bus arrival time', 'Ipadala ang oras ng dating ng bus'), price: 300, image: '' },
        { icon: 'car', category: bi('Transport'), tag: bi('Partner service'), name: bi('Car with driver'), desc: bi('Hourly or full-day car with a local driver who knows the hills.', 'Sasakyan na may driver kada oras o buong araw.'), priceText: bi('Ask for rate', 'Magtanong ng presyo'), note: bi('Request 1 day ahead', 'I-request 1 araw bago'), price: 0, image: '' },
        { icon: 'pin', category: bi('Tour'), tag: bi('Partner service'), name: bi('Baguio city tour'), desc: bi('Burnham Park, Mines View, The Mansion, Wright Park and the Cathedral in one easy day.', 'Burnham Park, Mines View, The Mansion, Wright Park at Cathedral.'), priceText: bi('Ask for rate', 'Magtanong ng presyo'), note: bi('Half-day or full-day', 'Half-day o full-day'), price: 0, image: '' },
        { icon: 'heart', category: bi('Tour'), tag: bi('Partner service'), name: bi('Strawberry farm & Valley of Colors'), desc: bi('La Trinidad half-day trip: strawberry picking (in season) and the painted hillside.', 'Half-day sa La Trinidad: strawberry at Valley of Colors.'), priceText: bi('Ask for rate', 'Magtanong ng presyo'), note: bi('Best in the morning', 'Mas maganda sa umaga'), price: 0, image: '' },
        { icon: 'waves', category: bi('Tour'), tag: bi('Partner service'), name: bi('Sagada trip'), desc: bi('Hanging coffins, caves and the sea of clouds. About 5–6 hours from Baguio; an overnight stay is best.', 'Hanging coffins, kuweba at sea of clouds. 5–6 oras mula Baguio.'), priceText: bi('Custom quote'), note: bi('Request 3 days ahead', 'I-request 3 araw bago'), price: 0, image: '' },
        { icon: 'basket', category: bi('Essential'), tag: bi('Host-arranged'), name: bi('Pasalubong pre-order'), desc: bi('Ube jam, strawberry jam, peanut brittle and Benguet coffee, ready before you leave.', 'Ube jam, strawberry jam, peanut brittle at Benguet coffee.'), priceText: bi('Cost + service fee', 'Halaga + service fee'), note: bi('Request 1 day before checkout', 'I-request 1 araw bago mag-checkout'), price: 0, image: '' },
        { icon: 'basket', category: bi('Essential'), tag: bi('Host-arranged'), name: bi('Grocery pre-stock'), desc: bi('Water, coffee, breakfast basics or family essentials ready on arrival.', 'Tubig, kape, almusal o pangangailangan pagdating.'), priceText: bi('Cost + service fee', 'Halaga + service fee'), note: bi('Request 24 hours ahead', 'I-request 24 oras bago'), price: 0, image: '' },
        { icon: 'washer', category: bi('Essential'), tag: bi('Partner service'), name: bi('Laundry pickup'), desc: bi('Wash-and-fold pickup and drop-off nearby.', 'Laba at tupi na kukunin at ihahatid.'), priceText: bi('₱250 per load', '₱250 bawat load'), note: bi('Same day when available', 'Parehong araw kung available'), price: 250, image: '' },
        { icon: 'flame', category: bi('Rental'), tag: bi('Host-arranged'), name: bi('Extra heater & blankets'), desc: bi('An extra space heater and thick blankets for cold nights.', 'Dagdag na heater at makapal na kumot.'), priceText: bi('Free for this stay', 'Libre'), note: bi('Subject to availability', 'Depende sa availability'), price: 0, image: '' },
        { icon: 'heart', category: bi('Special request'), tag: bi('Partner service'), name: bi('Birthday or anniversary setup'), desc: bi('Simple balloons, cake coordination or a small welcome surprise.', 'Simpleng lobo, cake o maliit na sorpresa.'), priceText: bi('Custom quote'), note: bi('Request 2 days ahead', 'I-request 2 araw bago'), price: 0, image: '' },
      ],
      problems: [
        { q: bi('Door access not working', 'Ayaw gumana ng pinto'), a: bi('Wake the keypad by touching it, then enter the code slowly. Still stuck? Contact the host.', 'Hawakan ang keypad at ilagay ang code nang dahan-dahan.'), image: '', video: '' },
        { q: bi('No Wi-Fi'), a: bi('Toggle Wi-Fi off and on, reconnect to the guest network, then restart your device if needed.', 'I-off at i-on ang Wi-Fi at kumonekta muli.'), image: '', video: '' },
        { q: bi('The unit feels cold', 'Malamig ang unit'), a: bi('Close all windows, turn on the space heater, and use the extra blankets in the closet. You can also request another heater.', 'Isara ang bintana, i-on ang heater at gamitin ang dagdag na kumot.'), image: '', video: '' },
        { q: bi('Water heater not heating', 'Ayaw uminit ng heater'), a: bi('Check that the wall switch is on and the red light is lit. Wait one minute with the tap open.', 'Siguraduhing naka-on ang switch at umiilaw ang pula.'), image: '', video: '' },
        { q: bi('TV not connecting', 'Ayaw kumonekta ng TV'), a: bi('Turn the TV off at the wall for 10 seconds, then on again.', 'Patayin sa saksakan ng 10 segundo, saka i-on muli.'), image: '', video: '' },
        { q: bi('Brownout', 'Brownout'), a: bi('The building generator usually starts within a minute. Keep a phone flashlight handy and message us if power is not back after 10 minutes.', 'Kadalasang bumubukas ang generator sa loob ng isang minuto.'), image: '', video: '' },
      ],
      emergency: [
        { icon: 'siren', label: bi('Emergency hotline'), desc: bi('Dial 911 anywhere in Baguio. Calls go straight to the city command center for police, fire and ambulance.', 'I-dial ang 911 saanman sa Baguio.'), phones: '911', mapUrl: '' },
        { icon: 'shield', label: bi('Baguio City Police Office'), desc: bi('City police.', 'Pulis ng lungsod.'), phones: '166, (074) 661-1471', mapUrl: gmap('Baguio City Police Office') },
        { icon: 'flame', label: bi('Baguio City Fire Station'), desc: bi('Fire and rescue.', 'Sunog at rescue.'), phones: '(074) 422-2222, (074) 443-7089', mapUrl: gmap('Baguio City Fire Station') },
        { icon: 'alert', label: bi('City disaster office (CDRRMO)'), desc: bi('Typhoons, landslides and road closures.', 'Bagyo, landslide at sarado na daan.'), phones: '(074) 442-1900', mapUrl: '' },
        { icon: 'heart', label: bi('Baguio General Hospital (BGHMC)'), desc: bi('Main public hospital with a 24/7 emergency room.', 'Pangunahing pampublikong ospital, 24/7 ER.'), phones: '', mapUrl: gmap('Baguio General Hospital and Medical Center') },
      ],
      notice: { title: bi('Generator & weather', 'Generator at panahon'), text: bi('The building has generator support. During typhoons, stay indoors and check road advisories before driving down the mountain.', 'May generator ang gusali. Kapag may bagyo, manatili sa loob at alamin ang lagay ng daan.') },
      procedures: [
        { title: bi('Fire', 'Sunog'), text: bi('Fire extinguishers are under the sink and beside the door outside. If there is smoke, leave immediately using the stairs and call 911. Do not use elevators during a fire alarm.', 'May fire extinguisher sa ilalim ng lababo at sa labas ng pinto. Kung may usok, lumabas gamit ang hagdan at tumawag sa 911.'), image: '', video: '' },
        { title: bi('Earthquake', 'Lindol'), text: bi('Drop, cover and hold. Stay away from glass. After shaking stops, exit calmly using the stairs if instructed by security.', 'Dumapa, magtago at kumapit. Lumayo sa salamin.'), image: '', video: '' },
        { title: bi('Typhoon or landslide', 'Bagyo o landslide'), text: bi('Stay indoors and away from windows. Do not travel on mountain roads until advisories are lifted. Call the CDRRMO for road updates.', 'Manatili sa loob at lumayo sa bintana. Huwag bumiyahe hangga\'t may advisory.'), image: '', video: '' },
      ],
      requestItems: [bi('Extra blankets', 'Dagdag na kumot'), bi('Extra towels', 'Dagdag na tuwalya'), bi('Toiletries'), bi('Drinking water', 'Inuming tubig'), bi('Extra pillow', 'Dagdag na unan'), bi('Coffee & tea', 'Kape at tsaa')],
      issueTypes: [bi('Heater'), bi('Hot water', 'Mainit na tubig'), bi('Electricity', 'Kuryente'), bi('Wi-Fi / TV'), bi('Door lock', 'Lock ng pinto'), bi('Leak', 'Tagas'), bi('Noise', 'Ingay'), bi('Other', 'Iba pa')],
      housekeepingOptions: [bi('Full cleaning', 'Buong paglilinis'), bi('Towel & linen change', 'Palit ng tuwalya at kobre-kama'), bi('Trash pick-up only', 'Kuha ng basura lamang')],
      housekeepingSlots: ['9:00 AM – 11:00 AM', '1:00 PM – 3:00 PM', '3:00 PM – 5:00 PM'],
      stayPolicy: bi('Early check-in and late checkout depend on availability. A small fee may apply. We will confirm as soon as possible.', 'Depende sa availability ang maagang check-in at late checkout. Maaaring may maliit na bayad.'),
      checkoutChecklist: [
        bi('Turn off the heater, lights and water heater', 'Patayin ang heater, ilaw at water heater'),
        bi('Close all windows', 'Isara ang lahat ng bintana'),
        bi('Put used towels in the bathroom', 'Ilagay ang gamit na tuwalya sa banyo'),
        bi('Separate and take out the trash', 'Ihiwalay at itapon ang basura'),
        bi('Return the keycard and lock the door', 'Ibalik ang keycard at i-lock ang pinto'),
      ],
    }],
    bookings: [{
      id: 'b_demo', code: 'PINES1', propertyId: 'p_pines', guestName: 'Maria Santos',
      checkIn: today, checkOut: addDays(today, 3), guests: 2, notes: 'Demo booking',
      status: 'upcoming', idStatus: 'none', idNote: '', checkInData: null, feedback: null, createdAt: Date.now(),
    }],
    requests: [],
    notifications: [],
    guestbook: [{ id: 'g_seed', propertyId: 'p_pines', name: 'Ana & Paolo', text: 'So cozy on a cold Baguio night. Walking distance to Session Road and the best strawberry taho!', status: 'approved', createdAt: Date.now() - 86400000 * 9 }],
  };
}

const Store = (() => {
  const KEY = 'guestportal_data_v3';
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
      if (typeof toast === 'function') toast('Storage is full. Use smaller photos or remove some images. A live server removes this limit.', 'err');
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

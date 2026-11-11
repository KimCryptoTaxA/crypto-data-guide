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

const bi = (en, fil) => ({ en, fil: fil == null ? en : fil });
const tile = (target, icon, color, t, s) => ({ target, icon, color, title: t, sub: s });

function seedData() {
  const today = ymd();
  return {
    version: 2,
    settings: {
      brandName: 'Casa Serena Stays',
      tagline: bi('Your home away from home', 'Ang iyong tahanan malayo sa tahanan'),
      hostName: 'Your Host',
      hostPhone: '+63 900 000 0000',
      hostEmail: 'host@example.com',
      currency: '₱',
      adminPin: '1234',
      accent: '#1f2a44',
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
      name: bi('The Harbor Suite'),
      welcomeLine: bi('Welcome to our home', 'Maligayang pagdating'),
      tagline: bi('Your cozy escape, minutes from Mactan Airport.', 'Ang maaliwalas ninyong pahingahan, ilang minuto mula sa Mactan Airport.'),
      location: 'Mactan, Cebu',
      address: 'Mactan, Lapu-Lapu City, Cebu',
      heroImage: '',
      checkInTime: '14:00',
      checkOutTime: '12:00',
      unlockHours: 48,
      doorCode: '4826#',
      wifi: { ssid: 'HarborSuite_5G', password: 'welcome2stay' },
      wifiNote: bi('Connect to the 5G network for the fastest speed. The router is beside the TV.', 'Kumonekta sa 5G network para sa pinakamabilis na koneksyon. Ang router ay nasa tabi ng TV.'),
      hostNote: bi('Message or call me anytime during your stay.', 'Mag-message o tumawag anumang oras habang kayo ay naririto.'),
      mapUrl: mapsSearch('Mactan, Lapu-Lapu City, Cebu'),
      reviewUrl: 'https://www.airbnb.com/',
      requireId: true,
      extrasCover: '',

      homeSections: [
        { title: bi('Quick access', 'Mabilisang access'), tiles: [
          tile('wifi', 'wifi', 'green', bi('Wi-Fi'), bi('Password and network', 'Password at network')),
          tile('p-door', 'key', 'beige', bi('Door access', 'Pagpasok sa pinto'), bi('Keycard and code', 'Keycard at code')),
          tile('p-parking', 'car', 'beige', bi('Parking'), bi('Where to park', 'Saan magpaparada')),
          tile('checkout', 'check', 'yellow', bi('Checkout'), bi('Final checklist', 'Huling checklist')),
        ] },
        { title: bi('Settle in', 'Pag-aayos'), tiles: [
          tile('p-sofa', 'sofa', 'mint', bi('Sofa bed'), bi('Sleep setup', 'Paghahanda sa pagtulog')),
          tile('p-tv', 'tv', 'lavender', bi('TV & apps'), bi('Remote and apps', 'Remote at apps')),
          tile('p-pool', 'waves', 'mint', bi('Pool'), bi('Hours and fees', 'Oras at bayad')),
          tile('p-trash', 'trash', 'mint', bi('Trash', 'Basura'), bi('Disposal guide', 'Gabay sa pagtapon')),
        ] },
        { title: bi('Extras & experiences', 'Extras at karanasan'), tiles: [
          tile('extras', 'sparkle', 'beige', bi('Extras'), bi('Rentals and tours', 'Rentals at tours')),
          tile('rules', 'lock', 'yellow', bi('House rules', 'Patakaran'), bi('Visitors and quiet hours', 'Bisita at tahimik na oras')),
          tile('guide', 'pin', 'sage', bi('Local guide', 'Gabay sa lugar'), bi('Food and places', 'Kainan at pasyalan')),
          tile('requests', 'message', 'sage', bi('Requests'), bi('Ask for anything', 'Humiling ng kahit ano')),
        ] },
      ],
      features: [
        { target: 'p-pool', image: '', eyebrow: bi('Tue–Sun, 7:00 AM – 9:00 PM'), title: bi('Pool access'), text: bi('Check the schedule, rules and extra guest fees before heading down.', 'Tingnan ang oras, patakaran at bayad para sa dagdag na bisita bago bumaba.'), button: bi('View details', 'Tingnan') },
        { target: 'extras', image: '', eyebrow: bi('Rentals, tours, transport'), title: bi('Extras & experiences', 'Extras at karanasan'), text: bi('Request pocket Wi-Fi, local tours, car rental, airport transfers and more.', 'Mag-request ng pocket Wi-Fi, tour, car rental, airport transfer at iba pa.'), button: bi('Browse extras', 'Tingnan ang extras') },
      ],
      panels: [
        { eyebrow: bi('Settle in', 'Pag-aayos'), title: bi('During your stay', 'Habang naririto'), text: bi('Make the condo feel effortless, from movie night to cooking and shower temperature.', 'Gawing madali ang lahat, mula movie night hanggang pagluluto at temperatura ng shower.'), tiles: [
          tile('p-tv', 'tv', 'navy', bi('TV & apps'), bi('Netflix, YouTube and more', 'Netflix, YouTube at iba pa')),
          tile('p-sofa', 'sofa', 'beige', bi('Sofa bed'), bi('Turn the lounge into a bed', 'Gawing kama ang sofa')),
          tile('p-shower', 'droplet', 'beige', bi('Hot and cold shower'), bi('Temperature and heater', 'Temperatura at heater')),
          tile('p-kitchen', 'utensils', 'beige', bi('Kitchen guides', 'Gabay sa kusina'), bi('Microwave, induction cooker, exhaust', 'Microwave, induction cooker, exhaust')),
        ] },
        { eyebrow: bi('Concierge desk'), title: bi('Need help?', 'Kailangan ng tulong?'), text: bi('Simple support when something feels unclear or urgent.', 'Madaling tulong kapag may hindi malinaw o urgent.'), tiles: [
          tile('host', 'phone', 'navy', bi('Host contact'), bi('Reach me anytime during your stay', 'Kontakin ako anumang oras')),
          tile('help', 'message', 'beige', bi('Request or report', 'Request o report'), bi('Items, issues and photos', 'Gamit, problema at litrato')),
          tile('housekeeping', 'concierge', 'beige', bi('Cleaning', 'Paglilinis'), bi('Refresh service for longer stays', 'Paglilinis para sa mahabang stay')),
          tile('problems', 'help', 'beige', bi('Common problems', 'Karaniwang problema'), bi('Lock, Wi-Fi, TV, heater, aircon', 'Lock, Wi-Fi, TV, heater, aircon')),
        ] },
      ],

      pages: [
        { id: 'door', icon: 'key', category: bi('Arrival', 'Pagdating'), title: bi('Door access', 'Pagpasok sa pinto'), summary: bi('Use the keycard first. The door code is a backup if the keycard is not with you.', 'Gamitin muna ang keycard. Ang door code ay pang-backup kung wala ang keycard.'), cover: '', inTutorials: true, private: false, showDoorCode: true, video: '',
          infoCards: [], lists: [], gallery: [],
          steps: [
            { title: bi('Arrive at the building', 'Pagdating sa gusali'), text: bi('Tell the guard you are a guest of Unit 1208 and show your booking name.', 'Sabihin sa guard na bisita kayo ng Unit 1208 at ipakita ang pangalan ng booking.'), image: '' },
            { title: bi('Go to the 12th floor', 'Pumunta sa 12th floor'), text: bi('Turn right after the elevator. Unit 1208 is the third door on the left.', 'Kumanan paglabas ng elevator. Ang Unit 1208 ay ikatlong pinto sa kaliwa.'), image: '' },
            { title: bi('Unlock the door', 'Buksan ang pinto'), text: bi('Tap the keycard on the lock. No keycard? Touch the keypad to wake it, then enter your door code.', 'I-tap ang keycard sa lock. Walang keycard? Hawakan ang keypad at ilagay ang door code.'), image: '' },
          ] },
        { id: 'sofa', icon: 'sofa', category: bi('Sleeping', 'Pagtulog'), title: bi('Sofa bed'), summary: bi('Switch between lounge mode and a flat bed in a minute.', 'Palitan mula sofa papuntang kama sa loob ng isang minuto.'), cover: '', inTutorials: true, private: false, showDoorCode: false, video: '',
          infoCards: [], lists: [], gallery: [],
          steps: [
            { title: bi('Day mode'), text: bi('Arrange the cushions against the backrest for comfortable seating.', 'Ayusin ang mga unan sa sandalan para komportableng upuan.'), image: '' },
            { title: bi('Clear the seat', 'Linisin ang upuan'), text: bi('Remove pillows, throws and personal items before opening the bed.', 'Alisin ang unan, kumot at gamit bago buksan ang kama.'), image: '' },
            { title: bi('Pull out the frame', 'Hilahin ang frame'), text: bi('Hold the front bar and pull it toward you in one smooth motion.', 'Hawakan ang harapang bar at hilahin papalapit sa inyo nang dahan-dahan.'), image: '' },
            { title: bi('Set night mode'), text: bi('Fold the legs down, make sure the bed is supported, and lay the mattress flat.', 'Ibaba ang mga paa, siguraduhing matatag, at ilatag ang kutson.'), image: '' },
            { title: bi('Return to sofa mode', 'Ibalik sa sofa'), text: bi('Lift the foot slightly, fold the legs in, and push the frame back until it locks.', 'Iangat nang kaunti, itiklop ang mga paa, at itulak pabalik hanggang mag-lock.'), image: '' },
          ] },
        { id: 'tv', icon: 'tv', category: bi('Appliances'), title: bi('TV & apps'), summary: bi('Use the remote, switch apps, and see which streaming accounts are provided.', 'Gamitin ang remote, magpalit ng app, at alamin kung aling streaming account ang kasama.'), cover: '', inTutorials: true, private: false, showDoorCode: false, video: '',
          infoCards: [{ label: bi('Included', 'Kasama'), text: bi('Netflix (Guest profile) and YouTube. Please sign out of personal accounts before checkout.', 'Netflix (Guest profile) at YouTube. Paki-sign out ang personal na account bago mag-checkout.') }],
          lists: [], gallery: [],
          steps: [
            { title: bi('Turn on', 'I-on'), text: bi('Press the red power button on the remote.', 'Pindutin ang pulang power button sa remote.'), image: '' },
            { title: bi('Open an app', 'Magbukas ng app'), text: bi('Press the Home button and pick Netflix or YouTube.', 'Pindutin ang Home at piliin ang Netflix o YouTube.'), image: '' },
          ] },
        { id: 'kitchen', icon: 'utensils', category: bi('Kitchen', 'Kusina'), title: bi('Kitchen guides', 'Gabay sa kusina'), summary: bi('Microwave, induction cooker and exhaust, with simple steps.', 'Microwave, induction cooker at exhaust, sa madaling hakbang.'), cover: '', inTutorials: true, private: false, showDoorCode: false, video: '',
          infoCards: [], gallery: [],
          lists: [{ title: bi('Cook safely', 'Ligtas na pagluluto'), tone: 'sage', items: bi('Use flat-bottom pans on the induction cooker.\nTurn on the exhaust while cooking.\nNever leave cooking unattended.', 'Gumamit ng flat na kawali sa induction.\nI-on ang exhaust habang nagluluto.\nHuwag iwanan ang niluluto.') }],
          steps: [
            { title: bi('Microwave'), text: bi('Set the time with the dial, then press Start. Use microwave-safe containers only.', 'I-set ang oras gamit ang dial, saka pindutin ang Start. Microwave-safe na lalagyan lamang.'), image: '' },
            { title: bi('Induction cooker'), text: bi('Press power, place the pan, then choose the heat level with + and –.', 'Pindutin ang power, ilagay ang kawali, saka piliin ang init gamit ang + at –.'), image: '' },
            { title: bi('Kitchen exhaust'), text: bi('Switch the fan on before cooking and leave it running for a few minutes after.', 'I-on ang bentilador bago magluto at hayaang tumakbo ng ilang minuto pagkatapos.'), image: '' },
          ] },
        { id: 'shower', icon: 'droplet', category: bi('Bathroom', 'Banyo'), title: bi('Hot and cold shower'), summary: bi('Temperature control, water heater timing, and quick fixes.', 'Kontrol ng temperatura, water heater, at mabilis na solusyon.'), cover: '', inTutorials: true, private: false, showDoorCode: false, video: '',
          infoCards: [], lists: [], gallery: [],
          steps: [
            { title: bi('Switch on the heater', 'I-on ang heater'), text: bi('Turn on the heater switch on the bathroom wall. The red light turns on.', 'I-on ang switch ng heater sa dingding ng banyo. Iilaw ang pula.'), image: '' },
            { title: bi('Wait one minute', 'Maghintay ng isang minuto'), text: bi('Give the water about a minute to warm up.', 'Hayaang uminit ang tubig ng mga isang minuto.'), image: '' },
            { title: bi('Adjust the temperature', 'I-adjust ang temperatura'), text: bi('Turn the handle left for warmer, right for cooler. Switch the heater off after use.', 'Ipihit pakaliwa para mas mainit, pakanan para mas malamig. Patayin ang heater pagkatapos.'), image: '' },
          ] },
        { id: 'aircon', icon: 'snowflake', category: bi('Appliances'), title: bi('Aircon'), summary: bi('Stay cool and save power.', 'Manatiling presko at makatipid sa kuryente.'), cover: '', inTutorials: true, private: false, showDoorCode: false, video: '',
          infoCards: [], lists: [], gallery: [],
          steps: [
            { title: bi('Turn on', 'I-on'), text: bi('Use the white remote by the bed. Press POWER and set COOL at 24°C.', 'Gamitin ang puting remote sa tabi ng kama. Pindutin ang POWER at i-set sa COOL, 24°C.'), image: '' },
            { title: bi('Close the windows', 'Isara ang bintana'), text: bi('Keep windows and the balcony door closed while the aircon is on.', 'Isara ang bintana at pinto ng balkonahe habang naka-on ang aircon.'), image: '' },
          ] },
        { id: 'pool', icon: 'waves', category: bi('Condo amenities', 'Amenities ng condo'), title: bi('Swimming pool'), summary: bi('Hours, rules and extra guest fees.', 'Oras, patakaran at bayad para sa dagdag na bisita.'), cover: '', inTutorials: false, private: false, showDoorCode: false, video: '',
          infoCards: [
            { label: bi('Pool hours', 'Oras ng pool'), text: bi('Tue–Sun, 7:00 AM – 9:00 PM') },
            { label: bi('Closed', 'Sarado'), text: bi('Every Monday for cleaning and maintenance.', 'Tuwing Lunes para sa paglilinis at maintenance.') },
            { label: bi('Access'), text: bi('Register at the amenity desk before entering.', 'Magparehistro sa amenity desk bago pumasok.') },
          ],
          lists: [
            { title: bi('Before swimming', 'Bago lumangoy'), tone: 'plain', items: bi('Shower before swimming.\nChildren must be supervised by an adult.\nNo glass bottles or loud speakers.\nFollow lifeguard and condo staff instructions.', 'Maligo bago lumangoy.\nDapat may kasamang adult ang mga bata.\nBawal ang bote na salamin at malakas na speaker.\nSundin ang lifeguard at staff ng condo.') },
            { title: bi('Extra guests', 'Dagdag na bisita'), tone: 'sage', items: bi('First 3 registered guests are included.\nAdditional pool guests are PHP 300 per person.\nPay the fee at the amenity desk.', 'Kasama ang unang 3 rehistradong bisita.\nAng dagdag na bisita ay PHP 300 bawat tao.\nMagbayad sa amenity desk.') },
          ],
          gallery: [], steps: [] },
        { id: 'trash', icon: 'trash', category: bi('Housekeeping'), title: bi('Trash disposal', 'Pagtapon ng basura'), summary: bi('Keep the unit fresh by using the trash room before checkout or whenever bins are full.', 'Panatilihing malinis ang unit sa paggamit ng trash room bago mag-checkout o kapag puno ang basurahan.'), cover: '', inTutorials: false, private: false, showDoorCode: false, video: '',
          infoCards: [],
          gallery: [
            { image: '', caption: bi('Start near the service elevator', 'Magsimula malapit sa service elevator') },
            { image: '', caption: bi('Walk toward the exit sign', 'Maglakad papunta sa exit sign') },
            { image: '', caption: bi('Garbage room door', 'Pinto ng garbage room') },
          ],
          lists: [
            { title: bi('Where to throw trash', 'Saan magtapon'), tone: 'plain', items: bi('The trash room is beside the service elevator on the same floor.\nSeparate food waste from plastic and cans.', 'Ang trash room ay nasa tabi ng service elevator sa parehong palapag.\nIhiwalay ang tirang pagkain sa plastik at lata.') },
            { title: bi('Overflow procedures', 'Kapag puno'), tone: 'plain', items: bi('If bins are full, tie the bag securely and bring it to the floor trash room.\nDo not leave trash in the hallway.', 'Kung puno, itali nang mabuti ang supot at dalhin sa trash room.\nHuwag iwan ang basura sa pasilyo.') },
          ],
          steps: [] },
        { id: 'parking', icon: 'car', category: bi('Arrival', 'Pagdating'), title: bi('Parking'), summary: bi('Where to park and how to get a pass.', 'Saan magparada at paano kumuha ng pass.'), cover: '', inTutorials: false, private: true, showDoorCode: false, video: '',
          infoCards: [
            { label: bi('Slot', 'Puwesto'), text: bi('Basement 1, slot B1-24.') },
            { label: bi('Parking pass'), text: bi('Show your booking name at the guard house to get a temporary pass.', 'Ipakita ang pangalan ng booking sa guard house para sa pansamantalang pass.') },
          ],
          lists: [], gallery: [], steps: [] },
      ],

      rules: [
        bi('Check-in from 2:00 PM, checkout by 12:00 noon.', 'Check-in mula 2:00 PM, checkout bago mag-12:00 ng tanghali.'),
        bi('No smoking or vaping inside the unit.', 'Bawal manigarilyo o mag-vape sa loob ng unit.'),
        bi('Quiet hours from 10:00 PM to 7:00 AM.', 'Tahimik na oras mula 10:00 PM hanggang 7:00 AM.'),
        bi('Visitors must be registered at the lobby. No parties or events.', 'Kailangang irehistro ang bisita sa lobby. Bawal ang party o event.'),
        bi('Turn off the aircon and lights when you go out.', 'Patayin ang aircon at ilaw kapag aalis.'),
      ],
      localGuide: [
        { category: bi('Food', 'Pagkain'), name: 'Seafood paluto restaurants', desc: bi('Pick fresh seafood and have it cooked your way.', 'Pumili ng sariwang seafood at ipaluto ayon sa gusto.'), mapUrl: mapsSearch('Seafood paluto Mactan'), image: '' },
        { category: bi('Food', 'Pagkain'), name: 'Coffee shops nearby', desc: bi('Cozy cafés within a short walk.', 'Mga café na malapit lang.'), mapUrl: mapsSearch('cafe Mactan Lapu-Lapu'), image: '' },
        { category: bi('Sights', 'Pasyalan'), name: 'Mactan Shrine', desc: bi('Historic site by the sea honoring Lapulapu.', 'Makasaysayang lugar sa tabi ng dagat.'), mapUrl: mapsSearch('Mactan Shrine Lapu-Lapu'), image: '' },
        { category: bi('Transport', 'Transportasyon'), name: 'Mactan-Cebu International Airport', desc: bi('About 5–15 minutes by car depending on traffic.', 'Mga 5–15 minuto sakay ng kotse depende sa trapiko.'), mapUrl: mapsSearch('Mactan-Cebu International Airport'), image: '' },
      ],
      services: [
        { icon: 'wifi', category: bi('Essential'), tag: bi('Host-arranged'), name: bi('Pocket Wi-Fi rental'), desc: bi('Stay connected while exploring Cebu, Mactan and nearby islands.', 'Manatiling konektado habang naglalakbay sa Cebu at mga isla.'), priceText: bi('Ask for rate', 'Magtanong ng presyo'), note: bi('Best requested before arrival', 'Mas mainam i-request bago dumating'), price: 0, image: '' },
        { icon: 'car', category: bi('Transport'), tag: bi('Partner service'), name: bi('Airport pickup or drop-off'), desc: bi('A private car for arrivals, departures or early flights.', 'Pribadong sasakyan para sa pagdating, pag-alis o maagang flight.'), priceText: bi('From ₱600 per trip', 'Mula ₱600 bawat biyahe'), note: bi('Request at least 1 day ahead', 'I-request 1 araw bago'), price: 600, image: '' },
        { icon: 'pin', category: bi('Tour'), tag: bi('Partner service'), name: bi('Cebu City tour'), desc: bi('Heritage stops, city views and classic Cebu food.', 'Makasaysayang lugar, tanawin ng lungsod at pagkaing Cebuano.'), priceText: bi('Ask for rate', 'Magtanong ng presyo'), note: bi('Half-day or full-day options', 'Half-day o full-day'), price: 0, image: '' },
        { icon: 'waves', category: bi('Tour'), tag: bi('Partner service'), name: bi('Island hopping'), desc: bi('Full-day boat tour with snorkeling and lunch.', 'Buong araw na boat tour na may snorkeling at tanghalian.'), priceText: bi('₱2,500 per person', '₱2,500 bawat tao'), note: bi('Weather permitting', 'Depende sa panahon'), price: 2500, image: '' },
        { icon: 'basket', category: bi('Essential'), tag: bi('Host-arranged'), name: bi('Grocery pre-stock'), desc: bi('Water, snacks, breakfast basics or family essentials ready on arrival.', 'Tubig, meryenda, almusal o pangangailangan ng pamilya pagdating.'), priceText: bi('Cost + service fee', 'Halaga + service fee'), note: bi('Request 24 hours ahead', 'I-request 24 oras bago'), price: 0, image: '' },
        { icon: 'washer', category: bi('Essential'), tag: bi('Partner service'), name: bi('Laundry pickup'), desc: bi('Wash-and-fold pickup and drop-off nearby.', 'Laba at tupi na kukunin at ihahatid.'), priceText: bi('₱250 per load', '₱250 bawat load'), note: bi('Same day when available', 'Parehong araw kung available'), price: 250, image: '' },
        { icon: 'car', category: bi('Rental'), tag: bi('Partner service'), name: bi('Car rental'), desc: bi('Third-party car rental for flexible Cebu travel.', 'Car rental mula sa partner para sa malayang paglalakbay.'), priceText: bi('3rd-party rate'), note: bi('License and availability required', 'Kailangan ng lisensya at availability'), price: 0, image: '' },
        { icon: 'sofa', category: bi('Rental'), tag: bi('Partner service'), name: bi('Baby gear rental'), desc: bi('Stroller, baby bath or other family gear when available.', 'Stroller, baby bath o iba pang gamit pang-pamilya.'), priceText: bi('Ask for rate', 'Magtanong ng presyo'), note: bi('Request early', 'I-request nang maaga'), price: 0, image: '' },
        { icon: 'heart', category: bi('Special request'), tag: bi('Partner service'), name: bi('Birthday or anniversary setup'), desc: bi('Simple balloons, cake coordination or a small welcome surprise.', 'Simpleng lobo, cake o maliit na sorpresa.'), priceText: bi('Custom quote'), note: bi('Request 2 days ahead', 'I-request 2 araw bago'), price: 0, image: '' },
      ],
      problems: [
        { q: bi('Door access not working', 'Ayaw gumana ng pinto'), a: bi('Wake the keypad by touching it, then enter the code slowly. Still stuck? Contact the host.', 'Hawakan ang keypad, saka ilagay ang code nang dahan-dahan. Ayaw pa rin? Kontakin ang host.') },
        { q: bi('No Wi-Fi'), a: bi('Toggle Wi-Fi off and on, reconnect to the guest network, then restart your device if needed.', 'I-off at i-on ang Wi-Fi, kumonekta muli, at i-restart ang device kung kailangan.') },
        { q: bi('TV not connecting', 'Ayaw kumonekta ng TV'), a: bi('Turn the TV off at the wall for 10 seconds, then on again.', 'Patayin sa saksakan ng 10 segundo, saka i-on muli.') },
        { q: bi('Netflix signed out'), a: bi('Message the host and we will sign it back in remotely.', 'Mag-message sa host at isa-sign in namin muli.') },
        { q: bi('Water heater not heating', 'Ayaw uminit ng heater'), a: bi('Check that the wall switch is on and the red light is lit. Wait one minute with the tap open.', 'Siguraduhing naka-on ang switch at umiilaw ang pula. Maghintay ng isang minuto.') },
        { q: bi('Aircon not cooling', 'Hindi lumalamig ang aircon'), a: bi('Set mode to COOL (snowflake), close the windows, and wait 10 minutes.', 'I-set sa COOL, isara ang bintana, at maghintay ng 10 minuto.') },
      ],
      emergency: [
        { icon: 'siren', label: bi('Emergency hotline'), desc: bi('National hotline for police, fire, ambulance and urgent response.', 'National hotline para sa pulis, bumbero at ambulansya.'), phones: '911', mapUrl: '' },
        { icon: 'shield', label: bi('Nearest police station', 'Pinakamalapit na presinto'), desc: bi('Local police station.', 'Lokal na presinto.'), phones: '(032) 000-0000', mapUrl: mapsSearch('police station Lapu-Lapu City') },
        { icon: 'flame', label: bi('City fire department', 'Bumbero ng lungsod'), desc: bi('Fire and rescue response.', 'Sunog at rescue.'), phones: '(032) 000-0001, (032) 000-0002', mapUrl: '' },
        { icon: 'heart', label: bi('Nearest hospital', 'Pinakamalapit na ospital'), desc: bi('24/7 emergency room.', '24/7 na emergency room.'), phones: '', mapUrl: mapsSearch('hospital near Mactan Lapu-Lapu') },
      ],
      notice: { title: bi('Generator information', 'Impormasyon sa generator'), text: bi('The building has generator support, so the unit should not lose power during normal outages.', 'May generator ang gusali kaya hindi dapat mawalan ng kuryente ang unit sa karaniwang brownout.') },
      procedures: [
        { title: bi('Fire', 'Sunog'), text: bi('Fire extinguishers are under the sink and beside the door outside. If there is smoke, leave immediately using the stairs and call 911. Do not use elevators during a fire alarm.', 'May fire extinguisher sa ilalim ng lababo at sa labas ng pinto. Kung may usok, lumabas agad gamit ang hagdan at tumawag sa 911. Huwag gumamit ng elevator.') },
        { title: bi('Earthquake', 'Lindol'), text: bi('Drop, cover and hold. Stay away from glass. After shaking stops, exit calmly using the stairs if instructed by security.', 'Dumapa, magtago at kumapit. Lumayo sa salamin. Pagkatapos, lumabas nang mahinahon gamit ang hagdan kung sasabihin ng security.') },
      ],
      requestItems: [bi('Extra towels', 'Dagdag na tuwalya'), bi('Toiletries'), bi('Drinking water', 'Inuming tubig'), bi('Extra pillow / blanket', 'Dagdag na unan / kumot'), bi('Toilet paper', 'Tissue'), bi('Kitchen supplies', 'Gamit sa kusina')],
      issueTypes: [bi('Aircon'), bi('Plumbing / water', 'Tubo / tubig'), bi('Electricity', 'Kuryente'), bi('Wi-Fi / TV'), bi('Door lock', 'Lock ng pinto'), bi('Noise', 'Ingay'), bi('Cleanliness', 'Kalinisan'), bi('Other', 'Iba pa')],
      housekeepingOptions: [bi('Full cleaning', 'Buong paglilinis'), bi('Towel & linen change', 'Palit ng tuwalya at kobre-kama'), bi('Trash pick-up only', 'Kuha ng basura lamang')],
      housekeepingSlots: ['9:00 AM – 11:00 AM', '1:00 PM – 3:00 PM', '3:00 PM – 5:00 PM'],
      stayPolicy: bi('Early check-in and late checkout depend on availability. A small fee may apply. We will confirm as soon as possible.', 'Ang maagang check-in at late checkout ay depende sa availability. Maaaring may maliit na bayad.'),
      checkoutChecklist: [
        bi('Turn off the aircon, lights and water heater', 'Patayin ang aircon, ilaw at water heater'),
        bi('Put used towels in the bathroom', 'Ilagay ang gamit na tuwalya sa banyo'),
        bi('Take out the trash', 'Itapon ang basura'),
        bi('Leave used dishes in the sink', 'Iwan sa lababo ang gamit na pinggan'),
        bi('Return the keycard and lock the door', 'Ibalik ang keycard at i-lock ang pinto'),
      ],
    }],
    bookings: [{
      id: 'b_demo', code: 'HARBOR1', propertyId: 'p_harbor', guestName: 'Maria Santos',
      checkIn: today, checkOut: addDays(today, 3), guests: 2, notes: 'Demo booking',
      status: 'upcoming', checkInData: null, feedback: null, createdAt: Date.now(),
    }],
    requests: [],
    notifications: [],
    guestbook: [{ id: 'g_seed', propertyId: 'p_harbor', name: 'Ana & Paolo', text: 'Lovely place, spotless and so close to the airport. The pool was a treat!', status: 'approved', createdAt: Date.now() - 86400000 * 9 }],
  };
}

const Store = (() => {
  const KEY = 'guestportal_data_v2';
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
    /* Match a reservation by last name for one property; prefers the stay that is current or next. */
    bookingByLastName(propertyId, name) {
      const n = String(name || '').trim().toLowerCase();
      if (n.length < 2) return null;
      const today = ymd();
      return data.bookings
        .filter(b => b.propertyId === propertyId && b.status !== 'checked_out' && b.checkOut >= today)
        .filter(b => { const parts = b.guestName.toLowerCase().split(/\s+/); return parts[parts.length - 1] === n || b.guestName.toLowerCase() === n; })
        .sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0] || null;
    },
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

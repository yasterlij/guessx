const { execSync } = require('child_process');
const bcrypt = require('./vendor/bcryptjs');

const DB_URL = process.env.DATABASE_URL || 'postgresql://admin:secret@localhost:5433/guessx_db';
const PROXY = 'http://localhost:3333/api/v1';
const ADMIN_PHONE = '0911111111';
const ADMIN_PASSWORD = '1234';
const USER_PASSWORD = '0000';
const TC_VERSION = '1.0';

const PRODUCTS = [
  { name: 'iPhone 15 Pro Max', bid_fee: 5, brand: 'Apple', category: 'Smartphones', description: '256GB Natural Titanium. A17 Pro chip, 48MP camera system, titanium design.', images: ['https://picsum.photos/seed/iphone-15-pro-max/800/600', 'https://picsum.photos/seed/iphone-15-pro-max-2/800/600'], specs: { storage: '256GB', chip: 'A17 Pro', camera: '48MP', display: '6.1" Super Retina XDR' } },
  { name: 'Samsung Galaxy S24 Ultra', bid_fee: 4, brand: 'Samsung', category: 'Smartphones', description: '512GB Titanium Gray. Galaxy AI, S Pen, 200MP camera, Snapdragon 8 Gen 3.', images: ['https://picsum.photos/seed/samsung-galaxy-s24-ultra/800/600', 'https://picsum.photos/seed/samsung-galaxy-s24-ultra-2/800/600'], specs: { storage: '512GB', chip: 'Snapdragon 8 Gen 3', camera: '200MP', display: '6.8" QHD+' } },
  { name: 'Sony WH-1000XM5', bid_fee: 3, brand: 'Sony', category: 'Audio', description: 'Industry-leading noise cancellation with Auto NC Optimizer. 30-hour battery life.', images: ['https://picsum.photos/seed/sony-wh-1000xm5/800/600', 'https://picsum.photos/seed/sony-wh-1000xm5-2/800/600'], specs: { type: 'Over-ear wireless', battery: '30h', noise_cancelling: 'Yes' } },
  { name: 'MacBook Air M3', bid_fee: 8, brand: 'Apple', category: 'Computers', description: '15-inch, 16GB RAM, 512GB SSD. Midnight finish. Up to 18 hours of battery life.', images: ['https://picsum.photos/seed/macbook-air-m3/800/600', 'https://picsum.photos/seed/macbook-air-m3-2/800/600'], specs: { screen: '15"', ram: '16GB', storage: '512GB SSD', chip: 'M3' } },
  { name: 'PlayStation 5 Slim', bid_fee: 5, brand: 'Sony', category: 'Gaming', description: 'Disc edition. 1TB SSD, DualSense wireless controller, 4K gaming.', images: ['https://picsum.photos/seed/playstation-5-slim/800/600', 'https://picsum.photos/seed/playstation-5-slim-2/800/600'], specs: { edition: 'Disc', storage: '1TB SSD', resolution: '4K' } },
  { name: 'Apple Watch Ultra 2', bid_fee: 2, brand: 'Apple', category: 'Electronics', description: '49mm titanium case, Precision dual-frequency GPS, Action button, 36hr battery.', images: ['https://picsum.photos/seed/apple-watch-ultra-2/800/600', 'https://picsum.photos/seed/apple-watch-ultra-2-2/800/600'], specs: { case: '49mm titanium', gps: 'Precision dual-frequency', battery: '36h' } },
  { name: 'Nintendo Switch OLED', bid_fee: 1, brand: 'Nintendo', category: 'Gaming', description: '7-inch OLED screen, wide adjustable stand, 64GB internal storage, enhanced audio.', images: ['https://picsum.photos/seed/nintendo-switch-oled/800/600', 'https://picsum.photos/seed/nintendo-switch-oled-2/800/600'], specs: { screen: '7" OLED', storage: '64GB', battery: '4.5-9h' } },
  { name: 'Bose QuietComfort Earbuds II', bid_fee: 1, brand: 'Bose', category: 'Audio', description: 'World-class noise cancellation, CustomTune technology, 6hr battery with 24hr case.', images: ['https://picsum.photos/seed/bose-quietcomfort-earbuds-ii/800/600', 'https://picsum.photos/seed/bose-quietcomfort-earbuds-ii-2/800/600'], specs: { type: 'True wireless earbuds', noise_cancelling: 'Yes', battery: '6h + 24h case' } },
  { name: 'Canon EOS R50', bid_fee: 1, brand: 'Canon', category: 'Electronics', description: '24.2MP APS-C CMOS sensor, 4K video, RF-S18-45mm lens kit, compact mirrorless.', images: ['https://picsum.photos/seed/canon-eos-r50/800/600', 'https://picsum.photos/seed/canon-eos-r50-2/800/600'], specs: { sensor: '24.2MP APS-C', video: '4K30', lens: 'RF-S18-45mm' } },
  { name: 'iPad Pro 13-inch M4', bid_fee: 2, brand: 'Apple', category: 'Tablets', description: 'Ultra Retina XDR display, M4 chip, Wi-Fi 6E, Apple Pencil Pro support, up to 1TB storage.', images: ['https://picsum.photos/seed/ipad-pro-13-inch-m4/800/600', 'https://picsum.photos/seed/ipad-pro-13-inch-m4-2/800/600'], specs: { display: 'Ultra Retina XDR', chip: 'M4', storage: 'up to 1TB' } },
  { name: 'AirPods Pro (2nd Gen)', bid_fee: 1, brand: 'Apple', category: 'Audio', description: 'Active noise cancellation, Adaptive Audio, USB-C MagSafe charging case, up to 6hr listening.', images: ['https://picsum.photos/seed/airpods-pro-2nd-gen/800/600', 'https://picsum.photos/seed/airpods-pro-2nd-gen-2/800/600'], specs: { noise_cancelling: 'Active', case: 'USB-C MagSafe', battery: '6h' } },
  { name: 'Google Pixel 9 Pro', bid_fee: 2, brand: 'Google', category: 'Smartphones', description: '6.3-inch Super Actua display, Tensor G4, 50MP triple camera, 7 years of OS updates.', images: ['https://picsum.photos/seed/google-pixel-9-pro/800/600', 'https://picsum.photos/seed/google-pixel-9-pro-2/800/600'], specs: { screen: '6.3" Super Actua', chip: 'Tensor G4', camera: '50MP triple' } },
  { name: 'Xbox Series X', bid_fee: 1, brand: 'Microsoft', category: 'Gaming', description: '1TB SSD, 12 teraflops GPU, 4K 120fps gaming, 8K HDR support, quick resume.', images: ['https://picsum.photos/seed/xbox-series-x/800/600', 'https://picsum.photos/seed/xbox-series-x-2/800/600'], specs: { storage: '1TB SSD', gpu: '12 TFLOPS', resolution: '4K 120fps' } },
  { name: 'Kindle Paperwhite (2024)', bid_fee: 1, brand: 'Amazon', category: 'Electronics', description: '7-inch 300ppi display, adjustable warm light, 12-week battery, 32GB storage, waterproof.', images: ['https://picsum.photos/seed/kindle-paperwhite-2024/800/600', 'https://picsum.photos/seed/kindle-paperwhite-2024-2/800/600'], specs: { display: '7" 300ppi', storage: '32GB', battery: '12 weeks', waterproof: 'IPX8' } },
  { name: 'GoPro HERO12 Black', bid_fee: 1, brand: 'GoPro', category: 'Electronics', description: '5.3K60 video, 27MP photos, HyperSmooth 6.0 stabilization, waterproof to 10m.', images: ['https://picsum.photos/seed/gopro-hero12-black/800/600', 'https://picsum.photos/seed/gopro-hero12-black-2/800/600'], specs: { video: '5.3K60', photo: '27MP', stabilization: 'HyperSmooth 6.0', waterproof: '10m' } },
  { name: 'DJI Mini 4 Pro', bid_fee: 1, brand: 'DJI', category: 'Electronics', description: 'Under 249g, 4K/60fps HDR, omnidirectional obstacle sensing, up to 34min flight time.', images: ['https://picsum.photos/seed/dji-mini-4-pro/800/600', 'https://picsum.photos/seed/dji-mini-4-pro-2/800/600'], specs: { weight: '<249g', video: '4K/60fps HDR', obstacle_sensing: 'Omnidirectional', flight_time: '34min' } },
  { name: 'Samsung Galaxy Watch 6', bid_fee: 1, brand: 'Samsung', category: 'Electronics', description: '44mm, AMOLED display, advanced sleep coaching, body composition analysis, 40hr battery.', images: ['https://picsum.photos/seed/samsung-galaxy-watch-6/800/600', 'https://picsum.photos/seed/samsung-galaxy-watch-6-2/800/600'], specs: { size: '44mm', display: 'AMOLED', battery: '40h' } },
  { name: 'MacBook Pro 14-inch M3 Pro', bid_fee: 2, brand: 'Apple', category: 'Computers', description: 'Liquid Retina XDR display, M3 Pro chip, 18GB RAM, 512GB SSD, up to 18hr battery.', images: ['https://picsum.photos/seed/macbook-pro-14-inch-m3-pro/800/600', 'https://picsum.photos/seed/macbook-pro-14-inch-m3-pro-2/800/600'], specs: { display: 'Liquid Retina XDR', chip: 'M3 Pro', ram: '18GB', storage: '512GB SSD' } },
  { name: 'Meta Quest 3', bid_fee: 1, brand: 'Meta', category: 'Electronics', description: 'Mixed reality headset, 4K+ infinite display, Snapdragon XR2 Gen 2, 128GB storage.', images: ['https://picsum.photos/seed/meta-quest-3/800/600', 'https://picsum.photos/seed/meta-quest-3-2/800/600'], specs: { display: '4K+ Infinite', chip: 'Snapdragon XR2 Gen 2', storage: '128GB' } },
  { name: 'Sony Alpha A7 IV', bid_fee: 2, brand: 'Sony', category: 'Electronics', description: '33MP full-frame sensor, 4K60 video, real-time tracking AF, 10fps burst shooting.', images: ['https://picsum.photos/seed/sony-alpha-a7-iv/800/600', 'https://picsum.photos/seed/sony-alpha-a7-iv-2/800/600'], specs: { sensor: '33MP full-frame', video: '4K60', burst: '10fps' } },
  { name: 'Fitbit Charge 6', bid_fee: 2.50, brand: 'Fitbit', category: 'Electronics', description: 'AMOLED display, built-in GPS, 40+ exercise modes, 7-day battery, heart rate tracking.', images: ['https://picsum.photos/seed/fitbit-charge-6/800/600', 'https://picsum.photos/seed/fitbit-charge-6-2/800/600'], specs: { display: 'AMOLED', gps: 'Built-in', battery: '7 days' } },
  { name: 'Anker 737 Power Bank', bid_fee: 1, brand: 'Anker', category: 'Electronics', description: 'PowerCore 24K, 140W USB-C PD fast charging, 24000mAh, charges a laptop in 2 hours.', images: ['https://picsum.photos/seed/anker-737-power-bank/800/600', 'https://picsum.photos/seed/anker-737-power-bank-2/800/600'], specs: { capacity: '24000mAh', output: '140W USB-C PD', laptop_charging: 'Yes' } },
  { name: 'Logitech MX Master 3S', bid_fee: 1, brand: 'Logitech', category: 'Electronics', description: '8K DPI sensor, silent clicks, MagSpeed scroll wheel, USB-C, connects to 3 devices.', images: ['https://picsum.photos/seed/logitech-mx-master-3s/800/600', 'https://picsum.photos/seed/logitech-mx-master-3s-2/800/600'], specs: { sensor: '8K DPI', scroll: 'MagSpeed', connectivity: 'Bluetooth + USB-C' } },
  { name: 'JBL Flip 6', bid_fee: 1.50, brand: 'JBL', category: 'Audio', description: 'Portable Bluetooth speaker, 12hr playtime, IP67 waterproof, PartyBoost pairing.', images: ['https://picsum.photos/seed/jbl-flip-6/800/600', 'https://picsum.photos/seed/jbl-flip-6-2/800/600'], specs: { type: 'Portable Bluetooth', battery: '12h', waterproof: 'IP67' } },
  { name: 'Segway Ninebot Kickscooter F40', bid_fee: 4, brand: 'Segway', category: 'Vehicles', description: 'Electric scooter with 40km range, 30km/h top speed, 10-inch pneumatic tires, dual braking system, and LED display. Perfect for urban commuting.', images: ['https://picsum.photos/seed/segway-ninebot-kickscooter-f40/800/600', 'https://picsum.photos/seed/segway-ninebot-kickscooter-f40-2/800/600'], specs: { range: '40km', top_speed: '30km/h', wheels: '10" pneumatic', weight_capacity: '120kg' } },
  { name: 'Trek Marlin 7 Mountain Bike', bid_fee: 3, brand: 'Trek', category: 'Vehicles', description: 'Hardtail mountain bike with Alpha Silver aluminum frame, Shimano Deore 1x12 drivetrain, hydraulic disc brakes, and 29-inch wheels for trail dominance.', images: ['https://picsum.photos/seed/trek-marlin-7-mountain-bike/800/600', 'https://picsum.photos/seed/trek-marlin-7-mountain-bike-2/800/600'], specs: { frame: 'Alpha Silver aluminum', drivetrain: 'Shimano Deore 1x12', brakes: 'Hydraulic disc', wheels: '29"' } },
  { name: 'Shoei RF-1400 Helmet', bid_fee: 2, brand: 'Shoei', category: 'Vehicles', description: 'Premium motorcycle helmet with AIM+ shell, advanced aerodynamics, CNS-1C face shield, and quiet ride. DOT and SNELL certified for maximum safety.', images: ['https://picsum.photos/seed/shoei-rf-1400-helmet/800/600', 'https://picsum.photos/seed/shoei-rf-1400-helmet-2/800/600'], specs: { shell: 'AIM+', certification: 'DOT/SNELL', shield: 'CNS-1C', weight: '1450g' } },
  { name: 'Ninja AF161 Air Fryer Max XL', bid_fee: 2, brand: 'Ninja', category: 'Home Appliances', description: '5.5-liter capacity air fryer with Max Crisp technology, 7 cooking functions, digital display, and dishwasher-safe parts. Healthier frying with little to no oil.', images: ['https://picsum.photos/seed/ninja-af161-air-fryer-max-xl/800/600', 'https://picsum.photos/seed/ninja-af161-air-fryer-max-xl-2/800/600'], specs: { capacity: '5.5L', functions: '7 cooking modes', technology: 'Max Crisp 240C', dishwasher_safe: 'Yes' } },
  { name: 'iRobot Roomba j7+', bid_fee: 3, brand: 'iRobot', category: 'Home Appliances', description: 'Self-emptying robot vacuum with Smart Mapping, obstacle avoidance, and Clean Base. Learns your home and avoids cords and pet waste. 60-minute battery.', images: ['https://picsum.photos/seed/irobot-roomba-j7/800/600', 'https://picsum.photos/seed/irobot-roomba-j7-2/800/600'], specs: { mapping: 'Smart Mapping', self_emptying: 'Yes', obstacle_avoidance: 'Yes', battery: '60min' } },
  { name: 'DeLonghi Magnifica Evo', bid_fee: 4, brand: 'DeLonghi', category: 'Home Appliances', description: 'Fully automatic espresso machine with built-in grinder, LatteCrema milk frother, 15-bar pressure, and 7 one-touch drinks. Barista-quality coffee at home.', images: ['https://picsum.photos/seed/delonghi-magnifica-evo/800/600', 'https://picsum.photos/seed/delonghi-magnifica-evo-2/800/600'], specs: { grinder: 'Built-in conical burr', pressure: '15 bar', drinks: '7 one-touch', water_tank: '1.8L' } },
  { name: 'Dyson Pure Cool TP09', bid_fee: 3, brand: 'Dyson', category: 'Home Appliances', description: 'HEPA H13 air purifier and bladeless fan that removes 99.95% of particles as small as 0.1 microns. Senses and reports air quality in real time.', images: ['https://picsum.photos/seed/dyson-pure-cool-tp09/800/600', 'https://picsum.photos/seed/dyson-pure-cool-tp09-2/800/600'], specs: { filtration: 'HEPA H13', coverage: '100 sq m', sensor: 'Real-time AQI', fan: 'Bladeless' } },
  { name: 'Google Nest Learning Thermostat', bid_fee: 2, brand: 'Google', category: 'Home Appliances', description: '3rd generation smart thermostat that learns your schedule and programs itself. Saves energy automatically, works with Alexa and Google Assistant.', images: ['https://picsum.photos/seed/google-nest-learning-thermostat/800/600', 'https://picsum.photos/seed/google-nest-learning-thermostat-2/800/600'], specs: { generation: '3rd', display: '2.08" LCD', learning: 'Auto-schedule', compatibility: 'Alexa/Google' } },
  { name: 'Omega Seamaster Diver 300M', bid_fee: 10, brand: 'Omega', category: 'Fashion', description: 'Swiss luxury automatic dive watch with 42mm stainless steel case, ceramic bezel, Co-Axial Master Chronometer movement, and 300m water resistance. A true icon.', images: ['https://picsum.photos/seed/omega-seamaster-diver-300m/800/600', 'https://picsum.photos/seed/omega-seamaster-diver-300m-2/800/600'], specs: { case: '42mm steel', movement: 'Co-Axial automatic', water_resistance: '300m', certification: 'Master Chronometer' } },
  { name: 'Schott NYC Perfecto Leather Jacket', bid_fee: 3, brand: 'Schott', category: 'Fashion', description: 'Iconic American motorcycle jacket in premium cowhide leather with asymmetrical zipper, belted waist, and quilted lining. Handcrafted in the USA since 1928.', images: ['https://picsum.photos/seed/schott-nyc-perfecto-leather-jacket/800/600', 'https://picsum.photos/seed/schott-nyc-perfecto-leather-jacket-2/800/600'], specs: { material: 'Premium cowhide', lining: 'Quilted', origin: 'Made in USA', hardware: 'YKK brass zipper' } },
  { name: 'Ray-Ban Aviator Classic', bid_fee: 1, brand: 'Ray-Ban', category: 'Fashion', description: 'Original aviator sunglasses with 58mm gold metal frame and G-15 green glass lenses. UV400 protection. Timeless design since 1937.', images: ['https://picsum.photos/seed/ray-ban-aviator-classic/800/600', 'https://picsum.photos/seed/ray-ban-aviator-classic-2/800/600'], specs: { frame: '58mm gold metal', lens: 'G-15 green glass', uv_protection: 'UV400', style: 'Aviator' } },
  { name: 'Chanel No. 5 Eau de Parfum', bid_fee: 2, brand: 'Chanel', category: 'Fashion', description: '100ml of the legendary fragrance. A timeless blend of aldehydes, jasmine, rose, sandalwood, and vanilla. The most iconic perfume in the world.', images: ['https://picsum.photos/seed/chanel-no-5-eau-de-parfum/800/600', 'https://picsum.photos/seed/chanel-no-5-eau-de-parfum-2/800/600'], specs: { volume: '100ml', type: 'Eau de Parfum', notes: 'Aldehyde floral', launched: '1921' } },
  { name: 'NordicTrack Commercial 1750 Treadmill', bid_fee: 5, brand: 'NordicTrack', category: 'Fitness', description: 'Premium treadmill with 3.6 CHP motor, 10-inch touchscreen, iFit integration, 0-12% incline, and 20x60 inch belt. Built for serious home training.', images: ['https://picsum.photos/seed/nordictrack-commercial-1750-treadmill/800/600', 'https://picsum.photos/seed/nordictrack-commercial-1750-treadmill-2/800/600'], specs: { motor: '3.6 CHP', screen: '10" touchscreen', incline: '0-12%', belt: '20x60"' } },
  { name: 'Bowflex SelectTech 552 Dumbbells', bid_fee: 3, brand: 'Bowflex', category: 'Fitness', description: 'Pair of adjustable dumbbells, each replacing 15 sets. Dial adjusts from 5 to 52.5 lbs. Space-saving design with included stand. Perfect for home gyms.', images: ['https://picsum.photos/seed/bowflex-selecttech-552-dumbbells/800/600', 'https://picsum.photos/seed/bowflex-selecttech-552-dumbbells-2/800/600'], specs: { weight_range: '5-52.5 lbs each', increments: '2.5 lbs', sets_replaced: '15 per dumbbell', includes: 'Stand' } },
  { name: 'Manduka PRO Yoga Mat', bid_fee: 1, brand: 'Manduka', category: 'Fitness', description: 'Premium 6mm thick yoga mat with lifetime guarantee. Closed-cell surface prevents sweat absorption, superior cushioning and grip. OEKO-TEX certified.', images: ['https://picsum.photos/seed/manduka-pro-yoga-mat/800/600', 'https://picsum.photos/seed/manduka-pro-yoga-mat-2/800/600'], specs: { thickness: '6mm', material: 'Eco-PVC', guarantee: 'Lifetime', certification: 'OEKO-TEX' } },
  { name: 'Garmin Venu 3 Fitness Tracker', bid_fee: 2, brand: 'Garmin', category: 'Fitness', description: 'AMOLED display smart fitness watch with built-in GPS, body battery energy monitoring, sleep coaching, and 14-day battery. 30+ activity profiles.', images: ['https://picsum.photos/seed/garmin-venu-3-fitness-tracker/800/600', 'https://picsum.photos/seed/garmin-venu-3-fitness-tracker-2/800/600'], specs: { display: 'AMOLED', gps: 'Built-in', battery: '14 days', activities: '30+ profiles' } },
  { name: 'Samsonite Omni 28" Spinner', bid_fee: 2, brand: 'Samsonite', category: 'Travel', description: 'Hardside spinner suitcase with 4 multi-directional wheels, TSA-approved combination lock, and scratch-resistant polycarbonate shell. Expandable for extra packing.', images: ['https://picsum.photos/seed/samsonite-omni-28-spinner/800/600', 'https://picsum.photos/seed/samsonite-omni-28-spinner-2/800/600'], specs: { size: '28"', material: 'Polycarbonate', wheels: '4 spinner', lock: 'TSA combination' } },
  { name: 'Bose QuietComfort Ultra Headphones', bid_fee: 3, brand: 'Bose', category: 'Audio', description: 'Over-ear wireless headphones with world-class noise cancellation, spatial audio with head tracking, 24-hour battery, and plush ear cushions for all-day comfort.', images: ['https://picsum.photos/seed/bose-quietcomfort-ultra-headphones/800/600', 'https://picsum.photos/seed/bose-quietcomfort-ultra-headphones-2/800/600'], specs: { type: 'Over-ear wireless', noise_cancelling: 'Adaptive', spatial_audio: 'Yes', battery: '24h' } },
  { name: 'Anker Nebula Capsule 3 Laser', bid_fee: 3, brand: 'Anker', category: 'Travel', description: 'Portable 1080p laser projector with 200 ANSI lumens, Android TV 11, built-in Dolby Audio speaker, and 2.5-hour battery. Cinema anywhere you go.', images: ['https://picsum.photos/seed/anker-nebula-capsule-3-laser/800/600', 'https://picsum.photos/seed/anker-nebula-capsule-3-laser-2/800/600'], specs: { resolution: '1080p', brightness: '200 ANSI lumens', system: 'Android TV 11', battery: '2.5h' } },
  { name: 'Insta360 X3 Action Camera', bid_fee: 2, brand: 'Insta360', category: 'Electronics', description: '360-degree action camera with dual 1/2" sensors, 5.7K video, 72MP photos, FlowState stabilization, and invisible selfie stick. Waterproof to 10m.', images: ['https://picsum.photos/seed/insta360-x3-action-camera/800/600', 'https://picsum.photos/seed/insta360-x3-action-camera-2/800/600'], specs: { video: '5.7K 360', photo: '72MP', stabilization: 'FlowState', waterproof: '10m' } },
  { name: 'Autel EVO Lite+ Drone', bid_fee: 4, brand: 'Autel', category: 'Electronics', description: '6K video drone with 1-inch CMOS sensor, 40-minute flight time, 3-axis gimbal, and obstacle avoidance. f/2.8-f/11 adjustable aperture for pro aerial cinematography.', images: ['https://picsum.photos/seed/autel-evo-lite-drone/800/600', 'https://picsum.photos/seed/autel-evo-lite-drone-2/800/600'], specs: { video: '6K30', sensor: '1" CMOS', flight_time: '40min', aperture: 'f/2.8-f/11' } },
  { name: 'Keychron Q1 Mechanical Keyboard', bid_fee: 2, brand: 'Keychron', category: 'Computing', description: '75% layout QMK/VIA programmable mechanical keyboard with CNC aluminum frame, gasket mount, hot-swappable switches, and per-key RGB. Premium typing feel.', images: ['https://picsum.photos/seed/keychron-q1-mechanical-keyboard/800/600', 'https://picsum.photos/seed/keychron-q1-mechanical-keyboard-2/800/600'], specs: { layout: '75%', mount: 'Gasket', switches: 'Hot-swappable', material: 'CNC aluminum' } },
  { name: 'LG 27GP850-B 4K Gaming Monitor', bid_fee: 3, brand: 'LG', category: 'Computing', description: '27-inch 4K UHD Nano IPS display with 144Hz refresh rate, 1ms response, G-Sync compatible, and HDR400. VESA mountable with USB-C 90W charging.', images: ['https://picsum.photos/seed/lg-27gp850-b-4k-gaming-monitor/800/600', 'https://picsum.photos/seed/lg-27gp850-b-4k-gaming-monitor-2/800/600'], specs: { size: '27"', resolution: '4K UHD', refresh_rate: '144Hz', response: '1ms', ports: 'USB-C 90W' } },
  { name: 'Logitech Brio 4K Webcam', bid_fee: 2, brand: 'Logitech', category: 'Computing', description: '4K Ultra HD webcam with HDR, RightLight 3 auto-exposure, 5x digital zoom, and Windows Hello facial recognition. Dual stereo mics with noise reduction.', images: ['https://picsum.photos/seed/logitech-brio-4k-webcam/800/600', 'https://picsum.photos/seed/logitech-brio-4k-webcam-2/800/600'], specs: { resolution: '4K UHD', fps: '90fps at 1080p', features: 'HDR + RightLight 3', mic: 'Dual stereo' } },
  { name: 'Anker 555 USB-C Hub (8-in-1)', bid_fee: 1, brand: 'Anker', category: 'Computing', description: '8-in-1 USB-C hub with 4K HDMI, 100W PD charging, Gigabit Ethernet, SD/microSD card readers, and 3 USB-A ports. Compact aluminum design for laptop expansion.', images: ['https://picsum.photos/seed/anker-555-usb-c-hub-8-in-1/800/600', 'https://picsum.photos/seed/anker-555-usb-c-hub-8-in-1-2/800/600'], specs: { ports: '8-in-1', hdmi: '4K@60Hz', charging: '100W PD', ethernet: 'Gigabit' } },
  { name: 'Wacom Intuos Pro Medium', bid_fee: 3, brand: 'Wacom', category: 'Computing', description: 'Professional pen tablet with 8.8x5.8 inch active area, 8192 pressure levels, multi-touch, and Pro Pen 2. Bluetooth and USB connectivity for digital artists.', images: ['https://picsum.photos/seed/wacom-intuos-pro-medium/800/600', 'https://picsum.photos/seed/wacom-intuos-pro-medium-2/800/600'], specs: { active_area: '8.8x5.8"', pressure: '8192 levels', pen: 'Pro Pen 2', connectivity: 'Bluetooth + USB' } },
  { name: 'Sonos Arc Sound Bar', bid_fee: 4, brand: 'Sonos', category: 'Audio', description: 'Premium Dolby Atmos sound bar with 11 drivers, upward-firing speakers for 3D sound, voice control, and Trueplay tuning. Wall-mountable for home theater.', images: ['https://picsum.photos/seed/sonos-arc-sound-bar/800/600', 'https://picsum.photos/seed/sonos-arc-sound-bar-2/800/600'], specs: { channels: '5.0.2 Dolby Atmos', drivers: '11', tuning: 'Trueplay', voice_control: 'Alexa/Google' } },
  { name: 'Audio-Technica AT-LP120XUSB Turntable', bid_fee: 3, brand: 'Audio-Technica', category: 'Audio', description: 'Direct-drive vinyl turntable with USB output for digitizing records, anti-skate control, pitch adjust, and included AT-VM95E cartridge. Plays 33/45/78 RPM.', images: ['https://picsum.photos/seed/audio-technica-at-lp120xusb-turntable/800/600', 'https://picsum.photos/seed/audio-technica-at-lp120xusb-turntable-2/800/600'], specs: { drive: 'Direct-drive', speeds: '33/45/78 RPM', usb: 'Yes', cartridge: 'AT-VM95E' } },
  { name: 'Klipsch R-41M Bookshelf Speakers', bid_fee: 2, brand: 'Klipsch', category: 'Audio', description: 'Pair of passive bookshelf speakers with 4-inch copper-spun woofer, 1-inch titanium LTS tweeter, and 90dB sensitivity. Reference series sound for small rooms.', images: ['https://picsum.photos/seed/klipsch-r-41m-bookshelf-speakers/800/600', 'https://picsum.photos/seed/klipsch-r-41m-bookshelf-speakers-2/800/600'], specs: { type: 'Passive bookshelf pair', woofer: '4" copper-spun', tweeter: '1" titanium', sensitivity: '90dB' } },
  { name: 'Secretlab TITAN Evo 2022 Gaming Chair', bid_fee: 4, brand: 'Secretlab', category: 'Gaming', description: 'Ergonomic gaming chair with cold-cure foam, 4D armrests, magnetic head pillow, and lumbar support system. SoftWeave fabric upholstery for marathon sessions.', images: ['https://picsum.photos/seed/secretlab-titan-evo-2022-gaming-chair/800/600', 'https://picsum.photos/seed/secretlab-titan-evo-2022-gaming-chair-2/800/600'], specs: { material: 'SoftWeave fabric', armrests: '4D', lumbar: 'L-Adapt system', foam: 'Cold-cure' } },
  { name: 'SteelSeries Arctis Nova 7 Gaming Headset', bid_fee: 2, brand: 'SteelSeries', category: 'Gaming', description: 'Wireless gaming headset with 2.4GHz + Bluetooth dual connectivity, 40-hour battery, Sonar AI noise cancellation, and retractable ClearCast mic. PC and console ready.', images: ['https://picsum.photos/seed/steelseries-arctis-nova-7-gaming-headset/800/600', 'https://picsum.photos/seed/steelseries-arctis-nova-7-gaming-headset-2/800/600'], specs: { connectivity: '2.4GHz + Bluetooth', battery: '40h', mic: 'ClearCast retractable', noise_cancellation: 'Sonar AI' } },
  { name: 'Logitech G923 Racing Wheel', bid_fee: 3, brand: 'Logitech', category: 'Gaming', description: 'TRUEFORCE force feedback racing wheel with integrated pedals, 900-degree rotation, programmable dual clutch, and progressive brake. PC, PS5, and Xbox compatible.', images: ['https://picsum.photos/seed/logitech-g923-racing-wheel/800/600', 'https://picsum.photos/seed/logitech-g923-racing-wheel-2/800/600'], specs: { feedback: 'TRUEFORCE force feedback', rotation: '900 degrees', pedals: 'Included 3-pedal', compatibility: 'PC/PS5/Xbox' } },
  { name: 'Kobo Clara 2E E-Reader', bid_fee: 1, brand: 'Kobo', category: 'Electronics', description: '6-inch 1448x1076 E Ink Carta 1200 display, 16GB storage, waterproof IPX8, ComfortLight PRO adjustable brightness, and weeks of battery life. OverDrive support.', images: ['https://picsum.photos/seed/kobo-clara-2e-e-reader/800/600', 'https://picsum.photos/seed/kobo-clara-2e-e-reader-2/800/600'], specs: { display: '6" E Ink 1448x1076', storage: '16GB', waterproof: 'IPX8', battery: 'Weeks' } },
  { name: 'Langogo Genesis Language Translator', bid_fee: 2, brand: 'Langogo', category: 'Electronics', description: 'Pocket-sized AI language translator supporting 100+ languages with two-way real-time translation, offline mode, and built-in data. 24-hour battery life.', images: ['https://picsum.photos/seed/langogo-genesis-language-translator/800/600', 'https://picsum.photos/seed/langogo-genesis-language-translator-2/800/600'], specs: { languages: '100+', mode: 'Two-way real-time', offline: 'Yes', battery: '24h' } },
];

// ============================================================
// ORGANIZATIONAL STRUCTURE (Awash Bank-style hierarchy)
// ============================================================

const DIVISIONS = [
  { id: 'div-001', name: 'Digital Banking Division', code: 'DBD', head_phone: '0911111111' },
  { id: 'div-002', name: 'Operations Division', code: 'OPS', head_phone: '0911111111' },
  { id: 'div-003', name: 'Finance & Compliance Division', code: 'FCD', head_phone: '0912222222' },
];

const DEPARTMENTS = [
  { id: 'dep-001', division_id: 'div-001', name: 'Digital Products Department', code: 'DPD', head_phone: '0913320001' },
  { id: 'dep-002', division_id: 'div-001', name: 'Platform Engineering Department', code: 'PED', head_phone: '0913320002' },
  { id: 'dep-003', division_id: 'div-002', name: 'Auction Operations Department', code: 'AOD', head_phone: '0913320003' },
  { id: 'dep-004', division_id: 'div-003', name: 'Financial Settlement Department', code: 'FSD', head_phone: '0913320004' },
];

const SECTIONS = [
  { id: 'sec-001', department_id: 'dep-001', name: 'Auction Products Section', code: 'APS', head_phone: '0913320005' },
  { id: 'sec-002', department_id: 'dep-002', name: 'Backend Engineering Section', code: 'BES', head_phone: '0913320006' },
  { id: 'sec-003', department_id: 'dep-003', name: 'Bid Operations Section', code: 'BOS', head_phone: '0913320007' },
  { id: 'sec-004', department_id: 'dep-004', name: 'Settlement & Reconciliation Section', code: 'SRS', head_phone: '0913320008' },
];

// ============================================================
// USERS WITH ENTERPRISE ROLE HIERARCHY
// ============================================================

const USERS = [
  // Executive Level
  { name: 'CEO Ato Dawit', phone: '0911111111', role: 'admin', balance: 50000, division_id: null, department_id: null, section_id: null },
  { name: 'CXO Finance', phone: '0912222222', role: 'admin', balance: 75000, division_id: 'div-003', department_id: null, section_id: null },

  // CXO Level (Chief Officers)
  { name: 'CTO Ato Yonas', phone: '0913320001', role: 'CXO', balance: 50000, division_id: 'div-001', department_id: null, section_id: null },
  { name: 'COO Ato Abebe', phone: '0913320002', role: 'CXO', balance: 45000, division_id: 'div-002', department_id: null, section_id: null },

  // Director Level
  { name: 'Director Meron', phone: '0913320003', role: 'DIRECTOR', balance: 35000, division_id: 'div-001', department_id: 'dep-001', section_id: null },
  { name: 'Director Henok', phone: '0913320004', role: 'DIRECTOR', balance: 32000, division_id: 'div-002', department_id: 'dep-003', section_id: null },
  { name: 'Director Ruth', phone: '0913320005', role: 'DIRECTOR', balance: 30000, division_id: 'div-003', department_id: 'dep-004', section_id: null },

  // Manager Level
  { name: 'Manager Saron', phone: '0913320006', role: 'MANAGER', balance: 20000, division_id: 'div-001', department_id: 'dep-001', section_id: 'sec-001' },
  { name: 'Manager Biruk', phone: '0913320007', role: 'MANAGER', balance: 18000, division_id: 'div-001', department_id: 'dep-002', section_id: 'sec-002' },
  { name: 'Manager Tigist', phone: '0913320008', role: 'MANAGER', balance: 17000, division_id: 'div-002', department_id: 'dep-003', section_id: 'sec-003' },
  { name: 'Manager Kaleb', phone: '0913320009', role: 'MANAGER', balance: 16000, division_id: 'div-003', department_id: 'dep-004', section_id: 'sec-004' },

  // Expert Level
  { name: 'Expert Betelhem', phone: '0913320010', role: 'EXPERT', balance: 11000, division_id: 'div-001', department_id: 'dep-001', section_id: 'sec-001' },
  { name: 'Expert Ephrem', phone: '0913320011', role: 'EXPERT', balance: 10500, division_id: 'div-001', department_id: 'dep-002', section_id: 'sec-002' },
  { name: 'Expert Nahom', phone: '0913320012', role: 'EXPERT', balance: 10000, division_id: 'div-002', department_id: 'dep-003', section_id: 'sec-003' },

  // Specialist Level
  { name: 'Specialist Makeda', phone: '0913320013', role: 'SPECIALIST', balance: 7500, division_id: 'div-001', department_id: 'dep-001', section_id: 'sec-001' },
  { name: 'Specialist Tsion', phone: '0913320014', role: 'SPECIALIST', balance: 7000, division_id: 'div-002', department_id: 'dep-003', section_id: 'sec-003' },
  { name: 'Specialist Samuel', phone: '0913320015', role: 'SPECIALIST', balance: 6800, division_id: 'div-003', department_id: 'dep-004', section_id: 'sec-004' },

  // Analyst Level
  { name: 'Analyst Frehiwot', phone: '0913320016', role: 'ANALYST', balance: 5000, division_id: 'div-001', department_id: 'dep-001', section_id: 'sec-001' },
  { name: 'Analyst Birtukan', phone: '0913320017', role: 'ANALYST', balance: 4800, division_id: 'div-003', department_id: 'dep-004', section_id: 'sec-004' },

  // Regular Users (bidders)
  { name: 'Selam Tesfaye', phone: '0913320018', role: 'user', balance: 4250.75, division_id: null, department_id: null, section_id: null },
  { name: 'Abebe Kebede', phone: '0913320019', role: 'user', balance: 3120.50, division_id: null, department_id: null, section_id: null },
  { name: 'Meron Tadesse', phone: '0913320020', role: 'user', balance: 5800.00, division_id: null, department_id: null, section_id: null },
  { name: 'Yonas Alemu', phone: '0913320021', role: 'user', balance: 2100.25, division_id: null, department_id: null, section_id: null },
  { name: 'Hanna Wondimu', phone: '0913320022', role: 'user', balance: 6750.00, division_id: null, department_id: null, section_id: null },
  { name: 'Dawit Hailu', phone: '0913320023', role: 'user', balance: 890.50, division_id: null, department_id: null, section_id: null },
  { name: 'Saron Girmay', phone: '0913320024', role: 'user', balance: 15000.00, division_id: null, department_id: null, section_id: null },
  { name: 'Biruk Assefa', phone: '0913320025', role: 'user', balance: 3200.00, division_id: null, department_id: null, section_id: null },
  { name: 'Tigist Woldie', phone: '0913320026', role: 'user', balance: 4950.75, division_id: null, department_id: null, section_id: null },
  { name: 'Henok Desta', phone: '0913320027', role: 'user', balance: 11000.00, division_id: null, department_id: null, section_id: null },
  { name: 'Betelhem Amanuel', phone: '0913320028', role: 'user', balance: 780.25, division_id: null, department_id: null, section_id: null },
];

function psql(sql) {
  try {
    execSync(`psql "${DB_URL}" -q -v ON_ERROR_STOP=1`, {
      input: sql,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch (e) {
    console.error('  ✗ DB error:', e.stderr?.toString().trim() || e.message);
    return false;
  }
}

function toUuid(seed) {
  const h = require('crypto').createHash('md5').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loginAsAdmin(retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${PROXY}/auth/login/phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: ADMIN_PHONE, password: ADMIN_PASSWORD }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data?.access_token) {
        throw new Error('Missing access_token in login response');
      }
      return data.access_token;
    } catch (e) {
      if (attempt === retries) throw e;
      await sleep(1000 * attempt);
    }
  }
  throw new Error('Unable to login as admin');
}

// ============================================================
// SEED: Organizational Structure
// ============================================================

function seedOrganizations() {
  console.log('  Seeding organizational structure...');
  let count = 0;

  for (const d of DIVISIONS) {
    const id = toUuid(`division-${d.id}`);
    const headId = toUuid(`user-${d.head_phone}`);
    const ok = psql(`INSERT INTO divisions (id, name, code, description, head_user_id, created_at) VALUES ('${id}', '${d.name}', '${d.code}', '${d.name} - Guess X Platform', '${headId}', NOW()) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, head_user_id = EXCLUDED.head_user_id`);
    if (ok) count++;
  }

  for (const d of DEPARTMENTS) {
    const id = toUuid(`department-${d.id}`);
    const divId = toUuid(`division-${d.division_id}`);
    const headId = toUuid(`user-${d.head_phone}`);
    const ok = psql(`INSERT INTO departments (id, division_id, name, code, description, head_user_id, created_at) VALUES ('${id}', '${divId}', '${d.name}', '${d.code}', '${d.name}', '${headId}', NOW()) ON CONFLICT (division_id, code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, head_user_id = EXCLUDED.head_user_id`);
    if (ok) count++;
  }

  for (const s of SECTIONS) {
    const id = toUuid(`section-${s.id}`);
    const depId = toUuid(`department-${s.department_id}`);
    const headId = toUuid(`user-${s.head_phone}`);
    const ok = psql(`INSERT INTO sections (id, department_id, name, code, description, head_user_id, created_at) VALUES ('${id}', '${depId}', '${s.name}', '${s.code}', '${s.name}', '${headId}', NOW()) ON CONFLICT (department_id, code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, head_user_id = EXCLUDED.head_user_id`);
    if (ok) count++;
  }

  return count;
}

// ============================================================
// SEED: Role Hierarchy
// ============================================================

function seedRoleHierarchy() {
  console.log('  Seeding role hierarchy...');
  const roles = [
    ['CEO', 1, null, 'Chief Executive Officer - Full system access'],
    ['admin', 1, null, 'System Administrator - Full system access'],
    ['CXO', 2, 'CEO', 'Chief Officer (CFO, CCO, CTO) - Division-level access'],
    ['DIRECTOR', 3, 'CXO', 'Director - Department-level access'],
    ['MANAGER', 4, 'DIRECTOR', 'Manager - Section-level access'],
    ['EXPERT', 5, 'MANAGER', 'Expert - Functional area access'],
    ['SPECIALIST', 6, 'EXPERT', 'Specialist - Narrow module scope'],
    ['ANALYST', 7, 'SPECIALIST', 'Analyst - Read-only/reporting access'],
    ['user', 7, null, 'Regular User - Standard user access'],
  ];

  let sql = '';
  for (const [role, level, parent, desc] of roles) {
    sql += `INSERT INTO role_hierarchy (role, level, parent_role, description) VALUES ('${role}', ${level}, ${parent ? `'${parent}'` : 'NULL'}, '${desc}') ON CONFLICT (role) DO UPDATE SET level = EXCLUDED.level, parent_role = EXCLUDED.parent_role, description = EXCLUDED.description;\n`;
  }
  return psql(sql) ? roles.length : 0;
}

// ============================================================
// SEED: Users with Enterprise Roles
// ============================================================

function seedUsers() {
  console.log('  Seeding users...');
  const userPinHash = bcrypt.hashSync('0000', 10);
  const adminPinHash = bcrypt.hashSync('1234', 10);
  const passwordHash = bcrypt.hashSync(USER_PASSWORD, 12);
  const adminPasswordHash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
  let count = 0;

  for (const u of USERS) {
    const id = toUuid(`user-${u.phone}`);
    const isAdmin = u.role === 'admin';
    const pinHash = isAdmin ? adminPinHash : userPinHash;
    const pwdHash = isAdmin ? adminPasswordHash : passwordHash;
    const name = u.name.replace(/'/g, "''");
    const divId = u.division_id ? `'${toUuid(`division-${u.division_id}`)}'` : 'NULL';
    const depId = u.department_id ? `'${toUuid(`department-${u.department_id}`)}'` : 'NULL';
    const secId = u.section_id ? `'${toUuid(`section-${u.section_id}`)}'` : 'NULL';

    const ok = psql(`INSERT INTO users (id, phone_number, full_name, password_hash, wallet_pin_hash, wallet_balance, role, phone_verified, auth_provider, pin_attempts, tc_accepted, tc_accepted_at, tc_version, division_id, department_id, section_id, created_at) VALUES ('${id}', '${u.phone}', '${name}', '${pwdHash}', '${pinHash}', ${u.balance}, '${u.role}', true, 'LOCAL', 0, true, NOW(), '${TC_VERSION}', ${divId}, ${depId}, ${secId}, NOW()) ON CONFLICT (phone_number) DO UPDATE SET full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash, wallet_pin_hash = EXCLUDED.wallet_pin_hash, wallet_balance = EXCLUDED.wallet_balance, role = EXCLUDED.role, phone_verified = EXCLUDED.phone_verified, pin_attempts = 0, pin_locked_until = NULL, tc_accepted = EXCLUDED.tc_accepted, tc_accepted_at = EXCLUDED.tc_accepted_at, tc_version = EXCLUDED.tc_version, division_id = EXCLUDED.division_id, department_id = EXCLUDED.department_id, section_id = EXCLUDED.section_id`);
    if (ok) count++;
  }

  psql(`UPDATE users SET pin_attempts = 0, pin_locked_until = NULL WHERE pin_attempts > 0 OR pin_locked_until IS NOT NULL`);
  return count;
}

// ============================================================
// SEED: Permission Overrides (Temporary Elevated Access)
// ============================================================

function seedPermissionOverrides() {
  console.log('  Seeding permission overrides...');
  const adminId = toUuid(`user-0911111111`);
  const analystId = toUuid(`user-0913320016`);

  const ok = psql(`INSERT INTO permission_overrides (id, user_id, granted_by, permissions, reason, expires_at, is_active, created_at) VALUES (uuid_generate_v4(), '${analystId}'::uuid, '${adminId}'::uuid, '{"Payment": ["read"], "Winner": ["read"]}'::jsonb, 'Temporary access for Q3 settlement audit', NOW() + INTERVAL '7 days', true, NOW()) ON CONFLICT DO NOTHING`);

  return ok ? 1 : 0;
}

// ============================================================
// SEED: Sample Disputes
// ============================================================

function seedDisputes() {
  console.log('  Seeding sample disputes...');
  let count = 0;

  const disputes = [
    { user_phone: '0913320018', auction_idx: 0, type: 'BID_DISPUTE', description: 'User claims their bid was not registered before auction close', status: 'OPEN' },
    { user_phone: '0913320019', auction_idx: 1, type: 'PAYMENT_DISPUTE', description: 'Payment was deducted but auction shows as unpaid', status: 'IN_REVIEW' },
    { user_phone: '0913320020', auction_idx: 2, type: 'WINNER_DISPUTE', description: 'User believes they had the lowest unique bid', status: 'RESOLVED', resolution: 'Verified via audit log - user bid was duplicated, not unique' },
  ];

  for (const d of disputes) {
    const userId = toUuid(`user-${d.user_phone}`);
    const auctionId = toUuid(`auction-${d.auction_idx}`);
    const ok = psql(`INSERT INTO disputes (id, user_id, auction_id, type, description, status, ${d.resolution ? 'resolution, ' : ''}created_at) VALUES (uuid_generate_v4(), '${userId}'::uuid, '${auctionId}'::uuid, '${d.type}', '${d.description.replace(/'/g, "''")}', '${d.status}', ${d.resolution ? `'${d.resolution.replace(/'/g, "''")}', ` : ''}NOW()) ON CONFLICT DO NOTHING`);
    if (ok) count++;
  }

  return count;
}

// ============================================================
// SEED: Sample Access Decisions
// ============================================================

function seedAccessDecisions() {
  console.log('  Seeding sample access decisions...');
  let count = 0;

  const decisions = [
    { user_phone: '0913320001', role: 'CXO', action: 'read', subject: 'Analytics', granted: true },
    { user_phone: '0913320001', role: 'CXO', action: 'delete', subject: 'User', granted: false, reason: 'CXO cannot delete users' },
    { user_phone: '0913320003', role: 'DIRECTOR', action: 'approve', subject: 'Product', granted: true },
    { user_phone: '0913320006', role: 'MANAGER', action: 'extend', subject: 'Winner', granted: true },
    { user_phone: '0913320013', role: 'SPECIALIST', action: 'manage', subject: 'all', granted: false, reason: 'Specialist cannot manage all' },
    { user_phone: '0913320016', role: 'ANALYST', action: 'read', subject: 'User', granted: false, reason: 'Analyst cannot read users' },
    { user_phone: '0913320016', role: 'ANALYST', action: 'read', subject: 'Analytics', granted: true },
  ];

  for (const d of decisions) {
    const userId = toUuid(`user-${d.user_phone}`);
    const ok = psql(`INSERT INTO access_decisions (id, user_id, user_role, action, subject, granted, reason, created_at) VALUES (uuid_generate_v4(), '${userId}'::uuid, '${d.role}', '${d.action}', '${d.subject}', ${d.granted}, ${d.reason ? `'${d.reason}'` : 'NULL'}, NOW() - INTERVAL '${Math.floor(Math.random() * 24)} hours') ON CONFLICT DO NOTHING`);
    if (ok) count++;
  }

  return count;
}

// ============================================================
// SEED: Products with Approval Status
// ============================================================

async function seedViaApi() {
  console.log('  Trying API...');
  const count = { products: 0, auctions: 0 };
  const adminToken = await loginAsAdmin();
  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };

  async function listAll(path, extraParams = {}) {
    const items = [];
    let page = 1;
    while (true) {
      const params = new URLSearchParams({ page: String(page), limit: '200', ...extraParams });
      const res = await fetch(`${PROXY}${path}?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error(`GET ${path} failed: HTTP ${res.status}`);
      const body = await res.json();
      const batch = Array.isArray(body) ? body : (body.data || []);
      items.push(...batch);
      const total = body?.meta?.total ?? items.length;
      if (batch.length === 0 || items.length >= total) break;
      page++;
    }
    return items;
  }

  const existingProducts = await listAll('/admin/products');
  const existingByName = new Map(existingProducts.map((p) => [p.name, p]));

  for (const p of PRODUCTS) {
    if (existingByName.has(p.name)) {
      count.products++;
      continue;
    }
    try {
      const res = await fetch(`${PROXY}/admin/products`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: p.name, current_market_price: 0, category: p.category, brand: p.brand, description: p.description, image_urls: p.images, specs: p.specs }),
      });
      if (res.ok) { count.products++; process.stdout.write('.'); }
      else process.stdout.write('x');
    } catch { process.stdout.write('x'); }
  }

  try {
    const products = await listAll('/admin/products');
    const activeAuctions = await listAll('/admin/auctions', { status: 'ACTIVE' });
    const activeProductIds = new Set(activeAuctions.map((a) => a.product_id).filter(Boolean));

    for (const product of products) {
      if (!product?.id || activeProductIds.has(product.id)) continue;
      const seedProduct = PRODUCTS.find((pp) => pp.name === product.name);
      const days = Math.floor(Math.random() * 5) + 1;
      try {
        const res = await fetch(`${PROXY}/admin/auctions`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ product_id: product.id, start_time: new Date(Date.now() - 86400000 * 3).toISOString(), end_time: new Date(Date.now() + 86400000 * days).toISOString(), bid_fee: seedProduct?.bid_fee || 1 }),
        });
        if (res.ok) activeProductIds.add(product.id);
      } catch { }
    }

    const seedNames = new Set(PRODUCTS.map((p) => p.name));
    count.auctions = products.filter((p) => seedNames.has(p.name) && activeProductIds.has(p.id)).length;
  } catch { }

  return count;
}

function seedViaDb() {
  console.log('  Trying direct DB...');
  const count = { products: 0, auctions: 0 };
  const adminId = toUuid(`user-0911111111`);

  for (const p of PRODUCTS) {
    const pid = toUuid(`product-${p.name}`);
    const images = JSON.stringify(p.images).replace(/'/g, "''");
    const specs = JSON.stringify(p.specs || {}).replace(/'/g, "''");
    const ok = psql(`INSERT INTO products (id, name, description, image_urls, current_market_price, category, brand, specs, approval_status, approved_by, approved_at) VALUES ('${pid}', '${p.name.replace(/'/g, "''")}', '${p.description.replace(/'/g, "''")}', '${images}'::jsonb, 0, '${p.category}', '${(p.brand || '').replace(/'/g, "''")}', '${specs}'::jsonb, 'APPROVED', '${adminId}'::uuid, NOW()) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_urls = EXCLUDED.image_urls, current_market_price = EXCLUDED.current_market_price, category = EXCLUDED.category, brand = EXCLUDED.brand, specs = EXCLUDED.specs, approval_status = EXCLUDED.approval_status, approved_by = EXCLUDED.approved_by, approved_at = EXCLUDED.approved_at`);
    if (ok) count.products++;
    else process.stdout.write('x');
  }

  for (let i = 0; i < PRODUCTS.length; i++) {
    const pid = toUuid(`product-${PRODUCTS[i].name}`);
    const aid = toUuid(`auction-${i}`);
    const days = Math.floor(Math.random() * 5) + 1;
    psql(`DELETE FROM winners WHERE auction_id = '${aid}' AND EXISTS (SELECT 1 FROM auctions a WHERE a.id = '${aid}' AND a.status <> 'ACTIVE')`);
    psql(`DELETE FROM bids WHERE auction_id = '${aid}' AND EXISTS (SELECT 1 FROM auctions a WHERE a.id = '${aid}' AND a.status <> 'ACTIVE')`);
    const ok = psql(`INSERT INTO auctions (id, product_id, start_time, end_time, status, bid_fee, created_at) VALUES ('${aid}', '${pid}', NOW() - INTERVAL '3 days', NOW() + INTERVAL '${days} days', 'ACTIVE', ${PRODUCTS[i]?.bid_fee || 1}, NOW()) ON CONFLICT (id) DO UPDATE SET product_id = EXCLUDED.product_id, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, status = 'ACTIVE', bid_fee = EXCLUDED.bid_fee, winner_user_id = NULL, winning_bid_amount = NULL, payment_status = NULL, payment_deadline = NULL, second_winner_assigned = FALSE, extensions = 0 WHERE auctions.status <> 'ACTIVE'`);
    if (ok) count.auctions++;
  }

  return count;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('🌱 Seeding Guess X database...\n');

  let orgCount = seedOrganizations();
  console.log(`  Organizations: ${orgCount} (divisions + departments + sections)`);

  let roleCount = seedRoleHierarchy();
  console.log(`  Role hierarchy: ${roleCount} roles`);

  let userCount = seedUsers();
  console.log(`  Users: ${userCount}/${USERS.length}`);

  let overrideCount = seedPermissionOverrides();
  console.log(`  Permission overrides: ${overrideCount}`);

  let disputeCount = seedDisputes();
  console.log(`  Sample disputes: ${disputeCount}`);

  let accessCount = seedAccessDecisions();
  console.log(`  Sample access decisions: ${accessCount}`);

  let count;
  if (process.env.DB_DIRECT) {
    count = seedViaDb();
  } else {
    try {
      count = await seedViaApi();
    } catch (e) {
      console.log(`\n  API unavailable (${e?.cause?.code || e?.message || 'error'}), falling back to direct DB...`);
      count = seedViaDb();
    }
    if (count.products === 0) {
      console.log('\n  API returned no products, falling back to direct DB...');
      count = seedViaDb();
    }
  }

  console.log(`  Products: ${count.products}/${PRODUCTS.length} (all APPROVED)`);
  console.log(`  Auctions: ${count.auctions}/${PRODUCTS.length} (ensured ACTIVE with fresh end times)`);
  console.log('\n✨ Seed complete!\n');
  console.log('📋 Seed Summary:');
  console.log(`   • ${USERS.length} users with enterprise roles (CEO, CXO, Director, Manager, Expert, Specialist, Analyst, User)`);
  console.log(`   • ${DIVISIONS.length} divisions, ${DEPARTMENTS.length} departments, ${SECTIONS.length} sections`);
  console.log(`   • All users have T&C accepted (v${TC_VERSION})`);
  console.log(`   • All products have approval_status = APPROVED`);
  console.log(`   • ${disputeCount} sample disputes, ${accessCount} sample access decisions`);
  console.log(`   • ${overrideCount} permission override (temporary elevated access)`);
  console.log('\n🔑 Login credentials:');
  console.log('   Admin/CEO:  0911111111 / 1234');
  console.log('   CXO:        0913320001 / 0000');
  console.log('   Director:   0913320003 / 0000');
  console.log('   Manager:    0913320006 / 0000');
  console.log('   Expert:     0913320010 / 0000');
  console.log('   Specialist: 0913320013 / 0000');
  console.log('   Analyst:    0913320016 / 0000');
  console.log('   User:       0913320018 / 0000');
}

main().catch(e => { console.error(e); process.exit(1); });
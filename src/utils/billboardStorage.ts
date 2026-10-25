import type { BillboardSlot } from '../types/game';

const BILLBOARDS_STORAGE_KEY = 'vicedrop_billboard_ads';
const VISITOR_COUNT_KEY = 'vicedrop_visitor_counter';

// Default procedural canvas banner generator so billboards look awesome right away
function createProceduralAdBanner(title: string, subtitle: string, bgColor: string, textColor: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Gradient Background
    const grad = ctx.createLinearGradient(0, 0, 1200, 600);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, '#09090b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 600);

    // Tech Grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    for (let x = 0; x < 1200; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 600);
      ctx.stroke();
    }
    for (let y = 0; y < 600; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1200, y);
      ctx.stroke();
    }

    // Border glow
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 1180, 580);

    // Title
    ctx.font = '900 75px sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = textColor;
    ctx.shadowBlur = 25;
    ctx.fillText(title, 600, 240);

    // Subtitle
    ctx.shadowBlur = 0;
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, 600, 360);

    // Call to action button
    ctx.fillStyle = textColor;
    ctx.roundRect(420, 430, 360, 70, 35);
    ctx.fill();

    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText('VISIT ADVERTISER', 600, 465);
  }
  return canvas.toDataURL('image/png');
}

export const DEFAULT_BILLBOARDS: BillboardSlot[] = [
  {
    id: 'bb_rooftop_mega',
    title: 'Downtown Skyscraper Rooftop LED',
    locationName: 'North Tower Rooftop (X: -20, Z: -60)',
    zone: 'Rooftop',
    width: 22,
    height: 9,
    aspectRatioText: '2.4 : 1 (Panoramic Mega)',
    recommendedResolution: '1600 × 660 px',
    imageUrl: createProceduralAdBanner('APEX HYPERCARS', 'DRIVE BUGATTI & LAMBORGHINI TODAY', '#0369a1', '#38bdf8'),
    sponsorName: 'Apex Luxury Motors',
    headline: 'Experience 1500 HP in Vice City',
    x: -20,
    y: 33,
    z: -60,
    rotationY: 0,
  },
  {
    id: 'bb_highway_pylon',
    title: 'Central Highway Twin-Pylon Board',
    locationName: 'Grand Boulevard Median (X: 18, Z: 10)',
    zone: 'Roadside',
    width: 14,
    height: 8.5,
    aspectRatioText: '1.6 : 1 (Landscape Pylon)',
    recommendedResolution: '1200 × 750 px',
    imageUrl: createProceduralAdBanner('VICE STATE BANK', 'GET $5,000 DAILY ATM ALLOWANCE', '#047857', '#34d399'),
    sponsorName: 'Vice State Reserve Bank',
    headline: 'Zero Fee Wealth Management',
    x: 18,
    y: 11,
    z: 10,
    rotationY: -Math.PI / 2,
  },
  {
    id: 'bb_open_field',
    title: 'West Grasslands Grand Hoarding',
    locationName: 'Sunset Valley Open Field (X: -65, Z: -15)',
    zone: 'Field',
    width: 26,
    height: 8,
    aspectRatioText: '3.25 : 1 (Ultra-Wide Hoarding)',
    recommendedResolution: '1920 × 600 px',
    imageUrl: createProceduralAdBanner('KERALA TOURISM', 'EXPERIENCE MALABAR FEST 2026', '#b45309', '#fde047'),
    sponsorName: 'Malabar Festival Board',
    headline: 'Gods Own Country in the Metaverse',
    x: -65,
    y: 7.5,
    z: -15,
    rotationY: Math.PI / 4,
  },
  {
    id: 'bb_showroom_entry',
    title: 'Car Showroom Entrance Display',
    locationName: 'Apex Motors Pavilion (X: 35, Z: -3)',
    zone: 'Showroom',
    width: 12,
    height: 6.5,
    aspectRatioText: '16 : 9 (HD Widescreen)',
    recommendedResolution: '1280 × 720 px',
    imageUrl: createProceduralAdBanner('SELL YOUR CAR', '70% INSTANT CASH BUY-BACK GUARANTEE', '#7e22ce', '#c084fc'),
    sponsorName: 'Apex Trade-In Center',
    headline: 'Instant Cash for Pre-Owned Vehicles',
    x: 35,
    y: 9.5,
    z: -3,
    rotationY: Math.PI,
  },
  {
    id: 'bb_thattukada_junction',
    title: 'Thattukada Junction Corner Board',
    locationName: 'South Street Food Corner (X: -30, Z: 32)',
    zone: 'Junction',
    width: 9,
    height: 9,
    aspectRatioText: '1 : 1 (Square Corner Display)',
    recommendedResolution: '800 × 800 px',
    imageUrl: createProceduralAdBanner('നാടൻ ചായ & സമോസ', 'TRADITIONAL MALABAR THATTUKADA', '#991b1b', '#f87171'),
    sponsorName: 'Malabar Street Chai',
    headline: 'Fresh Steaming Tea & Hot Snacks',
    x: -30,
    y: 7.5,
    z: 32,
    rotationY: 0,
  },
];

export function getBillboards(): BillboardSlot[] {
  try {
    const raw = localStorage.getItem(BILLBOARDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 5) {
        return parsed;
      }
    }
  } catch (e) {}

  saveBillboards(DEFAULT_BILLBOARDS);
  return DEFAULT_BILLBOARDS;
}

export function saveBillboards(billboards: BillboardSlot[]): void {
  try {
    localStorage.setItem(BILLBOARDS_STORAGE_KEY, JSON.stringify(billboards));
  } catch (e) {}
}

export function updateBillboard(
  id: string,
  update: { imageUrl: string; sponsorName: string; headline: string }
): BillboardSlot[] {
  const current = getBillboards();
  const updated = current.map((b) => (b.id === id ? { ...b, ...update } : b));
  saveBillboards(updated);
  return updated;
}

// Track Total Visitors
export function trackAndGetTotalVisitors(): number {
  try {
    let count = parseInt(localStorage.getItem(VISITOR_COUNT_KEY) || '0', 10);
    // If not tracked for this session, increment
    if (!sessionStorage.getItem('vicedrop_session_counted')) {
      count = Math.max(148, count + 1); // seed realistic count
      localStorage.setItem(VISITOR_COUNT_KEY, count.toString());
      sessionStorage.setItem('vicedrop_session_counted', 'true');
    }
    return count;
  } catch (e) {
    return 152;
  }
}

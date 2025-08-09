import React, { useEffect, useRef, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

export default function CalorieCanvasApp() {
  // Inputs
  const [weight, setWeight] = useState(150); // grams
  const [cal100, setCal100] = useState(165); // kcal per 100g
  const [fat100, setFat100] = useState(3.6); // g per 100g
  const [carb100, setCarb100] = useState(0); // g per 100g
  const [prot100, setProt100] = useState(31); // g per 100g

  const presets = [
    { name: 'Corn cakes', cal: 400, fat: 1.8, carb: 64, prot: 7.4 },
    { name: 'Avocado', cal: 160, fat: 15, carb: 9, prot: 2 },
    { name: 'Banana', cal: 89, fat: 0.3, carb: 23, prot: 1.1 },
    { name: 'Olive oil (100g)', cal: 884, fat: 100, carb: 0, prot: 0 }
  ];

  // Canvas refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('calorieCanvas.last');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setWeight(s.weight ?? 150);
        setCal100(s.cal100 ?? 165);
        setFat100(s.fat100 ?? 3.6);
        setCarb100(s.carb100 ?? 0);
        setProt100(s.prot100 ?? 31);
        // eslint-disable-next-line no-unused-vars
      } catch (e) { /* empty */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('calorieCanvas.last', JSON.stringify({ weight, cal100, fat100, carb100, prot100 }));
  }, [weight, cal100, fat100, carb100, prot100]);

  // Derived calculations
  const gramsFrom = (per100) => (Number(per100) * Number(weight)) / 100;
  const fatGrams = gramsFrom(fat100);
  const carbGrams = gramsFrom(carb100);
  const protGrams = gramsFrom(prot100);
  const caloriesDeclared = (Number(cal100) * Number(weight)) / 100;
  const calFromFat = fatGrams * 9;
  const calFromCarb = carbGrams * 4;
  const calFromProt = protGrams * 4;
  const caloriesFromMacros = calFromFat + calFromCarb + calFromProt;
  const pct = (v) => (caloriesFromMacros > 0 ? (v / caloriesFromMacros) * 100 : 0);
  const fatPct = pct(calFromFat);
  const carbPct = pct(calFromCarb);
  const protPct = pct(calFromProt);

  // Canvas drawing & layout
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let ctx = canvas.getContext('2d');

    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      const cssWidth = Math.max(320, rect.width); // ensure minimum width
      const cssHeight = Math.max(280, rect.height || 420); // ensure reasonable height

      canvas.style.width = cssWidth + 'px';
      canvas.style.height = cssHeight + 'px';
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(1);
    }

    let start = null;
    function step(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const duration = 600;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      draw(eased);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    window.addEventListener('resize', resizeCanvas);
    // call once after a small tick to allow layout to settle
    setTimeout(resizeCanvas, 10);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // re-run when inputs change
  }, [weight, cal100, fat100, carb100, prot100]);

  function draw(progress = 1) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // background
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#071431');
    grad.addColorStop(1, '#04263b');
    ctx.fillStyle = grad;
    roundRect(ctx, 0, 0, w, h, 14);
    ctx.fill();

    // card inset
    const padding = 18;
    const cardX = padding;
    const cardY = padding;
    const cardW = w - padding * 2;
    const cardH = h - padding * 2;

    ctx.save();
    ctx.shadowColor = 'rgba(2,6,23,0.6)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    roundRect(ctx, cardX, cardY, cardW, cardH, 18);
    ctx.fill();
    ctx.restore();

    // header and summary
    ctx.fillStyle = '#e6f6fb';
    ctx.font = '600 18px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
    ctx.textBaseline = 'top';
    ctx.fillText('Nutrition Facts', cardX + 20, cardY + 20);

    ctx.font = '500 13px system-ui';
    ctx.fillStyle = 'rgba(230,246,251,0.95)';
    const summaryY = cardY + 48;
    ctx.fillText(`Weight: ${Number(weight).toFixed(0)} g`, cardX + 20, summaryY);
    // place declared calories on the right edge of the table area (calculated later)

    // Responsive split: left area for table, right area for visuals
    // leftWidth adapts to card width; on narrow screens it takes most of the card
    const leftWidth = Math.min(420, Math.max(180, cardW * 0.58));
    const rightWidth = Math.max(140, cardW - leftWidth - 36);

    // Table area (left)
    const tableX = cardX + 20;
    const tableY = summaryY + 26;
    const rowH = 28;

    drawTableRow(ctx, tableX, tableY + 0 * rowH, 'Calories', `${Number(caloriesDeclared).toFixed(1)} kcal`);
    drawTableRow(ctx, tableX, tableY + 1 * rowH, 'Fat', `${fatGrams.toFixed(1)} g`);
    drawTableRow(ctx, tableX, tableY + 2 * rowH, 'Carbs', `${carbGrams.toFixed(1)} g`);
    drawTableRow(ctx, tableX, tableY + 3 * rowH, 'Protein', `${protGrams.toFixed(1)} g`);

    // Macro calories breakdown (left, below)
    const breakdownY = tableY + 4 * rowH + 10;
    ctx.font = '600 12px system-ui';
    ctx.fillStyle = '#a9f0ff';
    ctx.fillText('Calories from macros', tableX, breakdownY);

    ctx.font = '500 12px system-ui';
    ctx.fillStyle = '#d7fbff';
    ctx.fillText(`Fat: ${calFromFat.toFixed(1)} kcal (${fatPct.toFixed(1)}%)`, tableX, breakdownY + 20);
    ctx.fillText(`Carbs: ${calFromCarb.toFixed(1)} kcal (${carbPct.toFixed(1)}%)`, tableX, breakdownY + 40);
    ctx.fillText(`Protein: ${calFromProt.toFixed(1)} kcal (${protPct.toFixed(1)}%)`, tableX, breakdownY + 60);

    // discrepancy
    const diff = caloriesFromMacros - caloriesDeclared;
    const diffPct = caloriesDeclared ? (diff / caloriesDeclared) * 100 : 0;
    ctx.fillStyle = diff > 0 ? '#ffbaba' : '#d2ffd6';
    ctx.font = '600 12px system-ui';
    ctx.fillText(`Macro total: ${caloriesFromMacros.toFixed(1)} kcal`, tableX, breakdownY + 92);
    ctx.fillText(`Δ: ${diff >= 0 ? '+' : ''}${diff.toFixed(1)} kcal (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%)`, tableX + 180, breakdownY + 92);

    // Right side: visuals area (positioned to the right of the left table)
    const visualsX = cardX + leftWidth + 20; // start x of the right area
    const visualsY = cardY + 60;

    // donut size scales with available rightWidth
    const donutSize = Math.min(160, Math.max(80, rightWidth - 12));
    const donutThickness = Math.max(28, Math.min(48, donutSize * 0.28));
    drawDonut(ctx, visualsX + (rightWidth - donutSize) / 2, visualsY, donutSize, donutThickness, progress);

    // center labels near donut
    const centerX = visualsX + (rightWidth / 2);
    const centerY = visualsY + donutSize / 2;
    ctx.font = '600 14px system-ui';
    ctx.fillStyle = '#e6fbff';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(caloriesFromMacros)} kcal`, centerX, centerY - 8);
    ctx.font = '500 11px system-ui';
    ctx.fillStyle = '#9feeff';
    ctx.fillText(`${fatPct.toFixed(0)}% / ${carbPct.toFixed(0)}% / ${protPct.toFixed(0)}%`, centerX, centerY + 12);
    ctx.textAlign = 'start';

    // bars below donut
    const barX = visualsX + 6;
    const barY = visualsY + donutSize + 12;
    const barW = rightWidth - 12;
    const maxGram = Math.max(fatGrams, carbGrams, protGrams, 1);
    drawBar(ctx, barX, barY + 0, barW, 'Fat', fatGrams, maxGram, progress);
    drawBar(ctx, barX, barY + 28, barW, 'Carbs', carbGrams, maxGram, progress);
    drawBar(ctx, barX, barY + 56, barW, 'Protein', protGrams, maxGram, progress);

    // footer tip
    ctx.font = '400 11px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';

    // helper functions
    function drawTableRow(ctx, x, y, title, value) {
      ctx.font = '600 13px system-ui';
      ctx.fillStyle = 'rgba(215,251,255,0.95)';
      ctx.fillText(title, x, y + 6);
      ctx.font = '500 13px system-ui';
      ctx.fillStyle = 'rgba(170,230,245,0.98)';
      ctx.fillText(value, x + 120, y + 6);
    }

    function drawDonut(ctx, x, y, size, thickness, progress) {
      const colors = ['#ff9f1c', '#06b6d4', '#7c3aed'];
      const slices = [fatPct, carbPct, protPct];
      const cx = x + size / 2;
      const cy = y + size / 2;
      const radius = size / 2 - 6;

      // background ring
      ctx.beginPath();
      ctx.lineWidth = thickness;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      if (caloriesFromMacros <= 0) return; // nothing to draw

      let startAngle = -Math.PI / 2;
      for (let i = 0; i < slices.length; i++) {
        const slicePct = Math.max(0, slices[i] / 100);
        const endAngle = startAngle + slicePct * Math.PI * 2 * progress;
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineWidth = thickness - 6;
        ctx.strokeStyle = colors[i];
        ctx.arc(cx, cy, radius, startAngle + 0.02, endAngle - 0.02);
        ctx.stroke();
        startAngle += slicePct * Math.PI * 2;
      }
    }

    // function drawBar(ctx, x, y, w, label, value, max, progress) {
    //   const barH = 16;
    //   ctx.font = '600 12px system-ui';
    //   ctx.fillStyle = '#c7f7ff';
    //   ctx.fillText(label, x, y + 12);
    //   const barX = x + 70;
    //   const barW = w - 70;
    //   // background
    //   ctx.fillStyle = 'rgba(255,255,255,0.04)';
    //   roundRect(ctx, barX, y + 2, barW, barH, 8);
    //   ctx.fill();
    //   // fill width (corrected calculation)
    //   const fillWidth = Math.max(2, (value / max) * barW * progress);
    //   ctx.fillStyle = label === 'Fat' ? '#ff9f1c' : label === 'Carbs' ? '#06b6d4' : '#7c3aed';
    //   roundRect(ctx, barX + 2, y + 4, fillWidth - 4, barH - 4, 6);
    //   ctx.fill();

    //   // value text
    //   ctx.font = '500 11px system-ui';
    //   ctx.fillStyle = 'rgba(255,255,255,0.9)';
    //   ctx.fillText(`${value.toFixed(1)} g`, barX + barW + 6, y + 12);
    // }
    function drawBar(ctx, x, y, w, label, value, max, progress) {
      const barH = 16;
      ctx.font = '600 12px system-ui';
      ctx.fillStyle = '#c7f7ff';
      ctx.fillText(label, x, y + 12);

      // Reduce label width and adjust spacing
      const labelWidth = 50; // Reduced from 70
      const valueWidth = 50; // Space for the value text
      const barX = x + labelWidth;
      const barW = w - labelWidth - valueWidth; // Account for label and value space

      // background
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      roundRect(ctx, barX, y + 2, barW, barH, 8);
      ctx.fill();

      // fill width with proper bounds checking
      const fillWidth = Math.max(2, Math.min((value / max) * barW * progress, barW));
      ctx.fillStyle = label === 'Fat' ? '#ff9f1c' : label === 'Carbs' ? '#06b6d4' : '#7c3aed';
      roundRect(ctx, barX + 2, y + 4, fillWidth - 4, barH - 4, 6);
      ctx.fill();

      // value text - positioned relative to bar end
      ctx.font = '500 11px system-ui';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(`${value.toFixed(1)}g`, barX + barW + 4, y + 12);
    }

    function roundRect(ctx, x, y, width, height, radius) {
      if (typeof radius === 'undefined') radius = 5;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + width, y, x + width, y + height, radius);
      ctx.arcTo(x + width, y + height, x, y + height, radius);
      ctx.arcTo(x, y + height, x, y, radius);
      ctx.arcTo(x, y, x + width, y, radius);
      ctx.closePath();
    }
  }

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Construct the correct path using Vite's base URL
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;
      navigator.serviceWorker.register(swUrl)
        .then(registration => {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, notify user
                if (confirm('New version available! Would you like to update?')) {
                  window.location.reload();
                }
              }
            });
          });
        })
        .catch(error => console.log('Service worker registration failed:', error));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">CalorieCalc</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/3 p-4 rounded-2xl shadow-lg">
            <div className="space-y-4">
              <label className="block text-xs font-semibold uppercase text-sky-100">Weight (g)</label>
              <input
                inputMode="numeric"
                type="number"
                min={1}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value || 0))}
                className="w-full bg-white/5 p-3 rounded-xl outline-none text-white"
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold uppercase text-sky-100">kcal / 100g</label>
                  <input
                    inputMode="numeric"
                    type="number"
                    value={cal100}
                    onChange={(e) => setCal100(Number(e.target.value || 0))}
                    className="w-full bg-white/5 p-3 rounded-xl outline-none text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-sky-100">Fat / 100g (g)</label>
                  <input
                    inputMode="numeric"
                    type="number"
                    value={fat100}
                    onChange={(e) => setFat100(Number(e.target.value || 0))}
                    className="w-full bg-white/5 p-3 rounded-xl outline-none text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-sky-100">Carbs / 100g (g)</label>
                  <input
                    inputMode="numeric"
                    type="number"
                    value={carb100}
                    onChange={(e) => setCarb100(Number(e.target.value || 0))}
                    className="w-full bg-white/5 p-3 rounded-xl outline-none text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-sky-100">Protein / 100g (g)</label>
                  <input
                    inputMode="numeric"
                    type="number"
                    value={prot100}
                    onChange={(e) => setProt100(Number(e.target.value || 0))}
                    className="w-full bg-white/5 p-3 rounded-xl outline-none text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {presets.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => {
                      setCal100(p.cal);
                      setFat100(p.fat);
                      setCarb100(p.carb);
                      setProt100(p.prot);
                    }}
                    className="text-xs px-3 py-2 rounded-full bg-white/4 hover:bg-white/6"
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
              </div>
            </div>
          </motion.div>

          <div ref={containerRef} className="bg-transparent rounded-2xl overflow-hidden shadow-inner min-h-[340px]">
            <canvas ref={canvasRef} style={{ width: '100%', height: '420px', display: 'block' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

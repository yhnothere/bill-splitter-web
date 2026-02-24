import { useEffect, useRef, useState } from 'react'
import { CURRENCIES, IGNORE_KEYWORDS, PRICE_PATTERNS } from './utilities/constants';
import Header from './components/HeaderComponent';
import Tesseract from 'tesseract.js'
import './App.css'

function App() {
  const [showField, setShowField] = useState(false);
  const [title, setTitle] = useState("");
  const [paxCount, setPaxCount] = useState("");
  const [nameList, setNameList] = useState([]);
  const [itemInput, setItemInput] = useState("");
  const [items, setItems] = useState([]);
  const [mainCurrency, setMainCurrency] = useState("SGD");
  const [paidCurrency, setPaidCurrency] = useState("SGD");
  const [payer, setPayer] = useState("");
  const [rates, setRates] = useState({});
  const [discount, setDiscount] = useState([]);
  const [discountInput, setDiscountInput] = useState("");
  const [discountType, setDiscountType] = useState("flat");
  const [surcharge, setSurcharge] = useState([]);
  const [surchargeInput, setSurchargeInput] = useState("");
  const [surchargeType, setSurchargeType] = useState("percentage");
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setIsOpenCVReady] = useState(false);
  const [showCropModel, setShowCropModel] = useState(false);
  const [, setCropImage] = useState(null);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [boundingBox, setBoundingBox] = useState({ x: 100, y: 100, width: 400, height: 300 });
  const [resizingCorner, setResizingCorner] = useState(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    const checkOpenCV = setInterval(() => {
      if (window.cv) { setIsOpenCVReady(true); clearInterval(checkOpenCV); }
    }, 100);
    return () => clearInterval(checkOpenCV);
  }, []);

  useEffect(() => {
    fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vSOkEFYC6GqwvhtGGi5X8VjsvqLmH5k7wSXiJWyx3xKOKSsQlS2bvK0osSK5lXZec1gSp3FJteyVK4i/pub?gid=0&single=true&output=csv")
      .then(res => res.text())
      .then(csv => {
        const rows = csv.trim().split("\n");
        const headers = rows[0].split(",");
        const rateMap = {};
        for (let i = 1; i < rows.length; i++) {
          const values = rows[i].split(",");
          const from = values[0];
          rateMap[from] = {};
          for (let j = 1; j < headers.length; j++) rateMap[from][headers[j]] = Number(values[j]);
        }
        setRates(rateMap);
      });
  }, []);

  const HandlePaxCount = (n) => {
    setPaxCount(n);
    const count = Number(n);
    if (!count || count < 1) { setNameList([]); return; }
    setNameList(prev => {
      const updated = [...prev];
      if (count > updated.length) while (updated.length < count) updated.push("");
      else if (count < updated.length) updated.length = count;
      return updated;
    });
  };

  const HandleNameList = (i, n) => {
    const updated = [...nameList];
    updated[i] = n;
    setNameList(updated);
  };

  const HandleItemInput = (input) => {
    const str = input.match(/(\d+(\.\d+)?)/);
    if (!str) return null;
    const cost = Number(str[1]);
    if (cost <= 0) return null;
    const name = input.replace(str[1], "").trim();
    if (!name) return null;
    return { name, cost };
  };

  const HandleAddItem = () => {
    const str = HandleItemInput(itemInput);
    if (!str) return;
    setItems(prev => [...prev, {
      id: Date.now(), name: str.name, cost: str.cost,
      assignedTo: null, equalSplit: false, customSplit: null,
    }]);
    setItemInput("");
  };

  const HandleRemoveItem = (itemID) => {
    setItems(prev => prev.map(item => item.id === itemID ? { ...item, assignedTo: null } : item));
  };

  // ── Split modes: equalSplit and customSplit are mutually exclusive ────────
  const HandleEqualSplit = (itemID) => {
    setItems(prev => prev.map(item =>
      item.id === itemID
        ? { ...item, equalSplit: !item.equalSplit, customSplit: null, assignedTo: null }
        : item
    ));
  };

  const HandleToggleCustomSplit = (itemID) => {
    setItems(prev => prev.map(item =>
      item.id === itemID
        ? { ...item, customSplit: item.customSplit ? null : [], equalSplit: false, assignedTo: null }
        : item
    ));
  };

  const HandleCustomSplitPerson = (itemID, pIndex) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemID) return item;
      const cur = item.customSplit || [];
      const updated = cur.includes(pIndex) ? cur.filter(i => i !== pIndex) : [...cur, pIndex];
      return { ...item, customSplit: updated };
    }));
  };
  // ─────────────────────────────────────────────────────────────────────────

  const HandleAddDiscount = () => {
    const value = parseFloat(discountInput);
    if (!value || value <= 0) return;
    setDiscount(prev => [...prev, { id: Date.now(), value, type: discountType, appliedTo: null }]);
    setDiscountInput("");
  };
  const HandleRemoveDiscount = (id) => setDiscount(prev => prev.map(d => d.id === id ? { ...d, appliedTo: null } : d));
  const HandleDiscountDragStart = (e, id) => e.dataTransfer.setData("discountID", id);
  const HandleDiscountDrop = (e, target) => {
    e.preventDefault(); e.stopPropagation();
    const id = Number(e.dataTransfer.getData("discountID"));
    setDiscount(prev => prev.map(d => d.id === id ? { ...d, appliedTo: target } : d));
  };
  const HandleDiscountDragEnd = (e, id) => {
    if (e.dataTransfer.dropEffect === "none") setDiscount(prev => prev.map(d => d.id === id ? { ...d, appliedTo: null } : d));
  };

  const HandleAddSurcharge = () => {
    const value = parseFloat(surchargeInput);
    if (!value || value <= 0) return;
    setSurcharge(prev => [...prev, { id: Date.now(), value, type: surchargeType, appliedTo: null }]);
    setSurchargeInput("");
  };
  const HandleRemoveSurcharge = (id) => setSurcharge(prev => prev.map(s => s.id === id ? { ...s, appliedTo: null } : s));
  const HandleSurchargeDragStart = (e, id) => e.dataTransfer.setData("surchargeID", id);
  const HandleSurchargeDrop = (e, target) => {
    e.preventDefault(); e.stopPropagation();
    const id = Number(e.dataTransfer.getData("surchargeID"));
    setSurcharge(prev => prev.map(s => s.id === id ? { ...s, appliedTo: target } : s));
  };
  const HandleSurchargeDragEnd = (e, id) => {
    if (e.dataTransfer.dropEffect === "none") setSurcharge(prev => prev.map(s => s.id === id ? { ...s, appliedTo: null } : s));
  };

  const HandleDragStart = (e, id) => e.dataTransfer.setData("itemID", id);
  const HandleDrop = (e, pIndex) => {
    e.preventDefault(); e.stopPropagation();
    const id = Number(e.dataTransfer.getData("itemID"));
    setItems(prev => prev.map(item => item.id === id ? { ...item, assignedTo: pIndex } : item));
  };
  const HandleDragEnd = (e, id) => {
    if (e.dataTransfer.dropEffect === "none") setItems(prev => prev.map(item => item.id === id ? { ...item, assignedTo: null } : item));
  };

  const HandleConversion = (n, from, to) => {
    if (!n || from === to) return Number(n || 0);
    const rate = rates?.[from]?.[to];
    if (!rate) return 0;
    return Number((n * rate).toFixed(4));
  };

  const CalculateItemCost = (item) => {
    let cost = item.cost;
    discount.filter(d => d.appliedTo === item.id).forEach(d => {
      cost = d.type === "flat" ? cost - d.value : cost - (cost * d.value / 100);
    });
    cost = Math.max(0, cost);
    surcharge.filter(s => s.appliedTo === item.id).forEach(s => {
      cost = s.type === "flat" ? cost + s.value : cost + (cost * s.value / 100);
    });
    return Math.max(0, cost);
  };

  const CalculateTotalWithAdjustments = () => {
    let total = items.reduce((sum, item) => sum + CalculateItemCost(item), 0);
    discount.filter(d => d.appliedTo === "total").forEach(d => {
      total = d.type === "flat" ? total - d.value : total - (total * d.value / 100);
    });
    total = Math.max(0, total);
    surcharge.filter(s => s.appliedTo === "total").forEach(s => {
      total = s.type === "flat" ? total + s.value : total + (total * s.value / 100);
    });
    return Math.max(0, total);
  };

  // ── Per-person cost breakdown ────────────────────────────────────────────
  const GetPersonTotals = (i) => {
    const assigned = items.filter(item => item.assignedTo === i && !item.equalSplit);
    const assignedTotal = assigned.reduce((sum, item) => sum + CalculateItemCost(item), 0);

    const equalItems = items.filter(item => item.equalSplit);
    const equalTotal = equalItems.reduce((sum, item) => sum + CalculateItemCost(item), 0) / nameList.length;

    const customItems = items.filter(item =>
      Array.isArray(item.customSplit) && item.customSplit.includes(i) && item.customSplit.length > 0
    );
    const customTotal = customItems.reduce((sum, item) => sum + CalculateItemCost(item) / item.customSplit.length, 0);

    return { assigned, assignedTotal, equalTotal, customItems, customTotal };
  };
  // ─────────────────────────────────────────────────────────────────────────

  const HandlePreprocessing = (file) => {
    return new Promise((resolve) => {
      if (!window.cv) { resolve(file); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width; canvas.height = img.height;
          canvas.getContext("2d").drawImage(img, 0, 0);
          let src = window.cv.imread(canvas);
          const gray = new window.cv.Mat(); window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);
          const scaled = new window.cv.Mat(); window.cv.resize(gray, scaled, new window.cv.Size(gray.cols * 2, gray.rows * 2), 0, 0, window.cv.INTER_CUBIC);
          const filtered = new window.cv.Mat(); window.cv.bilateralFilter(scaled, filtered, 9, 75, 75);
          const clahe = new window.cv.CLAHE(2.0, new window.cv.Size(8, 8));
          const enhanced = new window.cv.Mat(); clahe.apply(filtered, enhanced);
          const binary = new window.cv.Mat(); window.cv.adaptiveThreshold(enhanced, binary, 255, window.cv.ADAPTIVE_THRESH_GAUSSIAN_C, window.cv.THRESH_BINARY, 21, 10);
          const kernel = window.cv.Mat.ones(2, 2, window.cv.CV_8U);
          const morphed = new window.cv.Mat(); window.cv.morphologyEx(binary, morphed, window.cv.MORPH_CLOSE, kernel);
          const denoised = new window.cv.Mat(); window.cv.medianBlur(morphed, denoised, 3);
          window.cv.imshow(canvas, denoised);
          src.delete(); gray.delete(); scaled.delete(); filtered.delete();
          enhanced.delete(); binary.delete(); kernel.delete(); morphed.delete(); denoised.delete();
          canvas.toBlob(blob => resolve(blob), "image/png");
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const HandleReceiptText = (text) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const newItems = [];
    lines.forEach(line => {
      const upperLine = line.toUpperCase();
      if (IGNORE_KEYWORDS.some(k => upperLine.includes(k))) return;
      if (line.length < 3 || /^[\d\s.\-*]+$/.test(line)) return;
      let price = null, priceMatch = null;
      for (const pattern of PRICE_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          const p = parseFloat(match[1]);
          if (p > 0 && p <= 500) { price = p; priceMatch = match[1]; break; }
        }
      }
      if (!price || !priceMatch) return;
      let name = line.replace(priceMatch, "").replace(/^\d+\s+/, "").replace(/\s+\d+\s*$/, "")
        .replace(/[^\w\s()/-]/g, " ").replace(/\s+/g, " ").trim();
      if (name.length < 2 || /^[A-Z]{1,3}$/.test(name) || /^\d+$/.test(name)) return;
      newItems.push({ id: Date.now() + Math.random(), name, cost: price, assignedTo: null, equalSplit: false, customSplit: null });
    });
    if (newItems.length) setItems(prev => [...prev, ...newItems]);
    else alert("No valid receipt items detected. Try taking a clearer photo or manually add items.");
  };

  const HandleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setCropImage(e.target.result);
        setShowCropModel(true);
        const vw = Math.min(window.innerWidth - 40, 600), vh = Math.min(window.innerHeight - 300, 500);
        setImagePosition({ x: 0, y: 0, scale: Math.min(vw / img.width, vh / img.height, 1) });
        setBoundingBox({ x: 100, y: 100, width: 400, height: 300 });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const HandleCropMouseDown = (e) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const corners = [
      { name: 'tl', x: boundingBox.x, y: boundingBox.y },
      { name: 'tr', x: boundingBox.x + boundingBox.width, y: boundingBox.y },
      { name: 'bl', x: boundingBox.x, y: boundingBox.y + boundingBox.height },
      { name: 'br', x: boundingBox.x + boundingBox.width, y: boundingBox.y + boundingBox.height }
    ];
    for (const c of corners) {
      if (Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2) < 30) { setResizingCorner(c.name); return; }
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
  };

  const HandleCrop = (e) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (resizingCorner) {
      const nb = { ...boundingBox };
      if (resizingCorner === 'tl') { nb.width += nb.x - x; nb.height += nb.y - y; nb.x = x; nb.y = y; }
      else if (resizingCorner === 'tr') { nb.width = x - nb.x; nb.height += nb.y - y; nb.y = y; }
      else if (resizingCorner === 'bl') { nb.width += nb.x - x; nb.height = y - nb.y; nb.x = x; }
      else { nb.width = x - nb.x; nb.height = y - nb.y; }
      if (nb.width > 100 && nb.height > 100 && nb.x >= 0 && nb.y >= 0 &&
          nb.x + nb.width <= canvas.width && nb.y + nb.height <= canvas.height) setBoundingBox(nb);
    } else if (isDragging) {
      setImagePosition(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
    } else {
      const corners = [
        { x: boundingBox.x, y: boundingBox.y }, { x: boundingBox.x + boundingBox.width, y: boundingBox.y },
        { x: boundingBox.x, y: boundingBox.y + boundingBox.height }, { x: boundingBox.x + boundingBox.width, y: boundingBox.y + boundingBox.height }
      ];
      canvas.style.cursor = corners.some(c => Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2) < 30) ? 'pointer' : 'move';
    }
  };

  const HandleCropMouseUp = () => { setIsDragging(false); setResizingCorner(null); };
  const HandleZoom = (delta) => setImagePosition(prev => ({ ...prev, scale: Math.max(0.5, Math.min(3, prev.scale + delta)) }));

  const HandleCropConfirm = async () => {
    if (!imageRef.current || !canvasRef.current) return;
    setShowCropModel(false); setIsProcessing(true);
    try {
      const img = imageRef.current;
      const { x: bx, y: by, width: bw, height: bh } = boundingBox;
      const cc = document.createElement('canvas'); cc.width = bw; cc.height = bh;
      cc.getContext('2d').drawImage(img, (bx - imagePosition.x) / imagePosition.scale, (by - imagePosition.y) / imagePosition.scale, bw / imagePosition.scale, bh / imagePosition.scale, 0, 0, bw, bh);
      const blob = await new Promise(res => cc.toBlob(res, 'image/png'));
      const processed = await HandlePreprocessing(blob);
      const result = await Tesseract.recognize(processed, 'eng', {
        tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
        preserve_interword_spaces: 1,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,$€-',
      });
      HandleReceiptText(result.data.text);
    } catch (err) {
      console.error('OCR Error:', err);
      alert('Failed to process image. Please try again.');
    } finally { setIsProcessing(false); }
  };

  const HandleCropCancel = () => { setShowCropModel(false); setCropImage(null); };
  const HandleFileUpload = () => document.getElementById('file-upload').click();

  useEffect(() => {
    if (!showCropModel || !canvasRef.current || !imageRef.current) return;
    const canvas = canvasRef.current, ctx = canvas.getContext('2d'), img = imageRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(imagePosition.x, imagePosition.y); ctx.scale(imagePosition.scale, imagePosition.scale); ctx.drawImage(img, 0, 0); ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, boundingBox.y);
    ctx.fillRect(0, boundingBox.y, boundingBox.x, boundingBox.height);
    ctx.fillRect(boundingBox.x + boundingBox.width, boundingBox.y, canvas.width - boundingBox.x - boundingBox.width, boundingBox.height);
    ctx.fillRect(0, boundingBox.y + boundingBox.height, canvas.width, canvas.height - boundingBox.y - boundingBox.height);
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3; ctx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
    [{ x: boundingBox.x, y: boundingBox.y }, { x: boundingBox.x + boundingBox.width, y: boundingBox.y },
     { x: boundingBox.x, y: boundingBox.y + boundingBox.height }, { x: boundingBox.x + boundingBox.width, y: boundingBox.y + boundingBox.height }
    ].forEach(c => {
      ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(c.x, c.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, Math.PI * 2); ctx.fill();
    });
  }, [showCropModel, imagePosition, boundingBox]);

  useEffect(() => {
    if (!showCropModel || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const handler = (e) => { e.preventDefault(); setImagePosition(prev => ({ ...prev, scale: Math.max(0.1, Math.min(5, prev.scale + (e.deltaY > 0 ? -0.1 : 0.1))) })); };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, [showCropModel]);

  const SurchargeLabel = (s) => s.type === "flat" ? `+${paidCurrency} ${s.value.toFixed(2)}` : `+${s.value}%`;
  const DiscountLabel = (d) => d.type === "flat" ? `${paidCurrency} ${d.value.toFixed(2)}` : `${d.value}%`;

  // ── Reusable item adjustment tag renderer ────────────────────────────────
  const RenderItemTags = (item) => {
    const itemDiscounts = discount.filter(d => d.appliedTo === item.id);
    const itemSurcharges = surcharge.filter(s => s.appliedTo === item.id);
    return (
      <>
        {itemDiscounts.length > 0 && (
          <div className='item-discounts'>
            {itemDiscounts.map(d => (
              <div key={d.id} className='item-discount-tag'>
                <span>{DiscountLabel(d)} OFF</span>
                <button onClick={() => HandleRemoveDiscount(d.id)}>×</button>
              </div>
            ))}
          </div>
        )}
        {itemSurcharges.length > 0 && (
          <div className='item-surcharges'>
            {itemSurcharges.map(s => (
              <div key={s.id} className='item-surcharge-tag'>
                <span>{SurchargeLabel(s)}</span>
                <button onClick={() => HandleRemoveSurcharge(s.id)}>×</button>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  // ── Determines if an item is "pending" (not yet fully assigned) ──────────
  const IsItemPending = (item) =>
    item.assignedTo === null &&
    !item.equalSplit &&
    !(Array.isArray(item.customSplit) && item.customSplit.length > 0);

  return (
    <div className='container'>
      <Header/>
      {!showField && (
        <button className='new' onClick={() => setShowField(true)}>Create New Bill</button>
      )}
      {showField && (
        <div className='info'>
          <h2>Create New Bill</h2>
          <label>Bill Name</label>
          <input type='text' placeholder='e.g. Dinner, Malaysia Day Trip' value={title} onChange={e => setTitle(e.target.value)} />
          <label>Number of Pax</label>
          <input type="number" min="1" value={paxCount} onClick={e => e.target.select()} onChange={e => HandlePaxCount(e.target.value)} />
          {nameList.length > 0 && (
            <div className='nameList'>
              <h3>Who's in this bill?</h3>
              {nameList.map((x, i) => {
                const { assigned, assignedTotal, equalTotal, customItems, customTotal } = GetPersonTotals(i);
                const paidCurrTotal = assignedTotal + equalTotal + customTotal;
                const mainCurrTotal = HandleConversion(paidCurrTotal, paidCurrency, mainCurrency);
                const hasContent = assigned.length > 0 || equalTotal > 0 || customItems.length > 0;
                return (
                  <div key={i} className='p-container'>
                    <div
                      className={`p-dropzone ${hasContent ? 'has-items' : ''}`}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => HandleDrop(e, i)}
                    >
                      <div className='p-header'>
                        <input type='checkbox' checked={payer === i} onChange={e => setPayer(e.target.checked ? i : "")} />
                        <input type='text' placeholder={`Person ${i + 1}`} value={x} onChange={e => HandleNameList(i, e.target.value)} />
                        {payer === i && <span className='payer-tag'>PAYER</span>}
                      </div>
                      {hasContent && (
                        <div className='p-items'>
                          {assigned.length > 0 && (
                            <>
                              <div className='p-items-tag'>Assigned Items ({assigned.length})</div>
                              {assigned.map(item => (
                                <div key={item.id} className='assigned-item-wrapper'
                                  onDragOver={e => e.preventDefault()}
                                  onDrop={e => { HandleDiscountDrop(e, item.id); HandleSurchargeDrop(e, item.id); }}>
                                  <div className='assigned-item' draggable
                                    onDragStart={e => HandleDragStart(e, item.id)}
                                    onDragEnd={e => HandleDragEnd(e, item.id)}>
                                    <span>{item.name} — {paidCurrency} {CalculateItemCost(item).toFixed(2)}</span>
                                    <button className='remove-btn' onClick={() => HandleRemoveItem(item.id)}>Remove</button>
                                  </div>
                                  {RenderItemTags(item)}
                                </div>
                              ))}
                            </>
                          )}
                          {equalTotal > 0 && (
                            <>
                              <div className='p-items-tag split-tag'>Equal Split Share</div>
                              <div className='split-share'>{paidCurrency} {equalTotal.toFixed(2)}</div>
                            </>
                          )}
                          {customItems.length > 0 && (
                            <>
                              <div className='p-items-tag custom-split-tag'>Custom Split Share</div>
                              {customItems.map(item => (
                                <div key={item.id} className='split-share custom-split-share'>
                                  <span>{item.name}</span>
                                  <span>{paidCurrency} {(CalculateItemCost(item) / item.customSplit.length).toFixed(2)}
                                    <span className='split-denominator'> (÷{item.customSplit.length})</span>
                                  </span>
                                </div>
                              ))}
                            </>
                          )}
                          <div className='p-total'>
                            Total: {mainCurrency} {mainCurrTotal.toFixed(2)}
                            {paidCurrency !== mainCurrency && (
                              <div className='p-total-breakdown'>({paidCurrency} {paidCurrTotal.toFixed(2)})</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {nameList.length > 0 && (
        <div className='details'>
          <h3>Bill Details</h3>
          <label>Main Currency</label>
          <select value={mainCurrency} onChange={e => setMainCurrency(e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label>Currency Paid In</label>
          <select value={paidCurrency} onChange={e => setPaidCurrency(e.target.value)}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label>Add Item</label>
          <div className='addItem'>
            <input type='text' value={itemInput} placeholder='Item Cost / Cost Item'
              onChange={e => setItemInput(e.target.value)} onKeyDown={e => e.key === "Enter" && HandleAddItem()} />
            <button onClick={HandleAddItem}>Add</button>
          </div>
          <label>Add Discount</label>
          <div className='addDiscount'>
            <input type='number' value={discountInput} placeholder='Amount'
              onChange={e => setDiscountInput(e.target.value)} onKeyDown={e => e.key === "Enter" && HandleAddDiscount()} />
            <select value={discountType} onChange={e => setDiscountType(e.target.value)}>
              <option value="flat">Flat</option>
              <option value="percentage">%</option>
            </select>
            <button onClick={HandleAddDiscount}>Add</button>
          </div>
          <label>Add Surcharge (GST / Service Charge)</label>
          <div className='addDiscount'>
            <input type='number' value={surchargeInput} placeholder='Amount'
              onChange={e => setSurchargeInput(e.target.value)} onKeyDown={e => e.key === "Enter" && HandleAddSurcharge()} />
            <select value={surchargeType} onChange={e => setSurchargeType(e.target.value)}>
              <option value="percentage">%</option>
              <option value="flat">Flat</option>
            </select>
            <button onClick={HandleAddSurcharge}>Add</button>
          </div>

          {discount.some(d => d.appliedTo === null) && (
            <div className='discounts'>
              <h3>Unassigned Discounts (Drag to item or total)</h3>
              {discount.filter(d => d.appliedTo === null).map(d => (
                <div key={d.id} className='discount-item' draggable
                  onDragStart={e => HandleDiscountDragStart(e, d.id)} onDragEnd={e => HandleDiscountDragEnd(e, d.id)}>
                  <span>{DiscountLabel(d)} OFF</span>
                </div>
              ))}
            </div>
          )}

          {surcharge.some(s => s.appliedTo === null) && (
            <div className='surcharges'>
              <h3>Unassigned Surcharges (Drag to item or total)</h3>
              {surcharge.filter(s => s.appliedTo === null).map(s => (
                <div key={s.id} className='surcharge-item' draggable
                  onDragStart={e => HandleSurchargeDragStart(e, s.id)} onDragEnd={e => HandleSurchargeDragEnd(e, s.id)}>
                  <span>{SurchargeLabel(s)}</span>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className='total-bill-section'
              onDragOver={e => e.preventDefault()}
              onDrop={e => { HandleDiscountDrop(e, "total"); HandleSurchargeDrop(e, "total"); }}>
              <h3>Total Bill Summary</h3>
              <div className='bill-summary'>
                <div className='summary-row'>
                  <span>Subtotal:</span>
                  <span>{paidCurrency} {items.reduce((sum, item) => sum + item.cost, 0).toFixed(2)}</span>
                </div>
                {discount.filter(d => d.appliedTo === "total").map(d => (
                  <div key={d.id} className='summary-row discount-row'>
                    <span>Discount ({DiscountLabel(d)}):</span>
                    <span className='discount-amount'>
                      -{paidCurrency} {d.type === "flat" ? d.value.toFixed(2) : (items.reduce((s, item) => s + CalculateItemCost(item), 0) * d.value / 100).toFixed(2)}
                      <button className='remove-discount-btn' onClick={() => HandleRemoveDiscount(d.id)}>×</button>
                    </span>
                  </div>
                ))}
                {surcharge.filter(s => s.appliedTo === "total").map(s => {
                  let base = items.reduce((sum, item) => sum + CalculateItemCost(item), 0);
                  discount.filter(d => d.appliedTo === "total").forEach(d => { base = d.type === "flat" ? base - d.value : base - base * d.value / 100; });
                  base = Math.max(0, base);
                  return (
                    <div key={s.id} className='summary-row surcharge-row'>
                      <span>Surcharge ({SurchargeLabel(s)}):</span>
                      <span className='surcharge-amount'>
                        +{paidCurrency} {(s.type === "flat" ? s.value : base * s.value / 100).toFixed(2)}
                        <button className='remove-discount-btn' onClick={() => HandleRemoveSurcharge(s.id)}>×</button>
                      </span>
                    </div>
                  );
                })}
                <div className='summary-row total-row'>
                  <span>Total:</span>
                  <strong>
                    {paidCurrency} {CalculateTotalWithAdjustments().toFixed(2)}
                    {paidCurrency !== mainCurrency && (
                      <span className='converted-total'> ({mainCurrency} {HandleConversion(CalculateTotalWithAdjustments(), paidCurrency, mainCurrency).toFixed(2)})</span>
                    )}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <label>Or Scan Receipt</label>
          <div className='scan'>
            <button className='scan-button' disabled={isProcessing}>📷 Take Photo</button>
            <button className='scan-button' onClick={HandleFileUpload} disabled={isProcessing}>📁 Upload Image</button>
          </div>
          <input id='file-upload' type='file' accept='image/*' onChange={HandleImageSelect} style={{ display: 'none' }} />

          {/* ── Unassigned / pending items ── */}
          {items.some(IsItemPending) && (
            <div className='items'>
              <h3>Unassigned Items (Drag to assign)</h3>
              {items.filter(IsItemPending).map(item => (
                <div key={item.id} className='item'
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { HandleDiscountDrop(e, item.id); HandleSurchargeDrop(e, item.id); }}>
                  <div className='item-main' draggable onDragStart={e => HandleDragStart(e, item.id)} onDragEnd={e => HandleDragEnd(e, item.id)}>
                    <span>{item.name} — {paidCurrency} {CalculateItemCost(item).toFixed(2)}</span>
                    <div className='split-options'>
                      <label className='split-checkbox'>
                        <input type='checkbox' checked={item.equalSplit} onChange={() => HandleEqualSplit(item.id)} />
                        Split All
                      </label>
                      <label className='split-checkbox'>
                        <input type='checkbox' checked={Array.isArray(item.customSplit)} onChange={() => HandleToggleCustomSplit(item.id)} />
                        Custom Split
                      </label>
                    </div>
                  </div>
                  {RenderItemTags(item)}
                </div>
              ))}
            </div>
          )}

          {/* ── Equal split items ── */}
          {items.some(i => i.equalSplit) && (
            <div className='items split-items-section'>
              <h3>Split Equally — All {nameList.length} Pax</h3>
              {items.filter(item => item.equalSplit).map(item => (
                <div key={item.id} className='item split-item'
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { HandleDiscountDrop(e, item.id); HandleSurchargeDrop(e, item.id); }}>
                  <div className='item-main'>
                    <span>{item.name} — {paidCurrency} {CalculateItemCost(item).toFixed(2)}</span>
                    <div className='split-options'>
                      <label className='split-checkbox'>
                        <input type='checkbox' checked={true} onChange={() => HandleEqualSplit(item.id)} />
                        Split All
                      </label>
                      <label className='split-checkbox'>
                        <input type='checkbox' checked={false} onChange={() => { HandleEqualSplit(item.id); HandleToggleCustomSplit(item.id); }} />
                        Custom Split
                      </label>
                    </div>
                  </div>
                  {RenderItemTags(item)}
                </div>
              ))}
            </div>
          )}

          {/* ── Custom split items ── */}
          {items.some(i => Array.isArray(i.customSplit)) && (
            <div className='items custom-split-section'>
              <h3>Custom Split</h3>
              {items.filter(item => Array.isArray(item.customSplit)).map(item => (
                <div key={item.id} className='item custom-split-item'
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { HandleDiscountDrop(e, item.id); HandleSurchargeDrop(e, item.id); }}>
                  <div className='item-main'>
                    <span>{item.name} — {paidCurrency} {CalculateItemCost(item).toFixed(2)}</span>
                    <div className='split-options'>
                      <label className='split-checkbox'>
                        <input type='checkbox' checked={false} onChange={() => { HandleToggleCustomSplit(item.id); HandleEqualSplit(item.id); }} />
                        Split All
                      </label>
                      <label className='split-checkbox'>
                        <input type='checkbox' checked={true} onChange={() => HandleToggleCustomSplit(item.id)} />
                        Custom Split
                      </label>
                    </div>
                  </div>

                  {/* Person picker */}
                  <div className='custom-split-picker'>
                    <span className='custom-split-label'>
                      Split among ({item.customSplit.length} selected
                      {item.customSplit.length > 0 && ` — ${paidCurrency} ${(CalculateItemCost(item) / item.customSplit.length).toFixed(2)} each`}):
                    </span>
                    <div className='custom-split-people'>
                      {nameList.map((name, pIndex) => (
                        <label key={pIndex} className={`person-chip ${item.customSplit.includes(pIndex) ? 'selected' : ''}`}>
                          <input type='checkbox'
                            checked={item.customSplit.includes(pIndex)}
                            onChange={() => HandleCustomSplitPerson(item.id, pIndex)} />
                          {name || `Person ${pIndex + 1}`}
                        </label>
                      ))}
                    </div>
                  </div>

                  {RenderItemTags(item)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCropModel && (
        <div className='crop-model' onMouseMove={HandleCrop} onMouseUp={HandleCropMouseUp} onMouseLeave={HandleCropMouseUp}>
          <div className='crop-content'>
            <h3>Position Your Items</h3>
            <p>Drag the image to position the items within the box</p>
            <canvas ref={canvasRef} width={600} height={500} className='crop-canvas' onMouseDown={HandleCropMouseDown} />
            <div className='crop-controls'>
              <button onClick={() => HandleZoom(-0.2)}>Zoom Out</button>
              <span className='zoom-level'>{Math.round(imagePosition.scale * 100)}%</span>
              <button onClick={() => HandleZoom(0.2)}>Zoom In</button>
            </div>
            <div className='crop-actions'>
              <button onClick={HandleCropCancel} className='cancel-btn'>Cancel</button>
              <button onClick={HandleCropConfirm} className='confirm-btn'>Process Receipt</button>
            </div>
          </div>
        </div>
      )}
      {isProcessing && (
        <div className='processing'>
          <div className='processing-bar'></div>
          <p>Processing Image...</p>
        </div>
      )}
    </div>
  );
}

export default App
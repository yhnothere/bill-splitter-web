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
      if (window.cv) {
        console.log('OpenCV loaded!');
        setIsOpenCVReady(true);
        clearInterval(checkOpenCV);
      }
    }, 100);
    return () => clearInterval(checkOpenCV);
  }, []);

  useEffect(() => {
    fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vSOkEFYC6GqwvhtGGi5X8VjsvqLmH5k7wSXiJWyx3xKOKSsQlS2bvK0osSK5lXZec1gSp3FJteyVK4i/pub?gid=0&single=true&output=csv")
      .then((res) => res.text())
      .then((csv) => {
        const rows = csv.trim().split("\n");
        const headers = rows[0].split(",");
        const rateMap = {};
        for (let i = 1; i < rows.length; i++) {
          const values = rows[i].split(",");
          const from = values[0];
          rateMap[from] = {};
          for (let j = 1; j < headers.length; j++) {
            rateMap[from][headers[j]] = Number(values[j]);
          }
        }
        setRates(rateMap);
      });
  }, []);

  const HandlePaxCount = (n) => {
    setPaxCount(n);
    const count = Number(n);
    if (!count || count < 1) {
      setNameList([]);
      return;
    }
    setNameList((prevNameList) => {
      const updated = [...prevNameList];
      if (count > updated.length) {
        while (updated.length < count) { updated.push("") }
      }
      else if (count < updated.length) {
        updated.length = count;
      }
      return updated;
    });
  }

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
    if (!str) return null;
    setItems((prev) => [...prev, {
      id: Date.now(),
      name: str.name,
      cost: str.cost,
      assignedTo: null,
      equalSplit: false,
    },]);
    setItemInput("");
  };

  const HandleRemoveItem = (itemID) => {
    setItems((prev) => 
      prev.map((item) =>
        item.id === itemID ? { ...item, assignedTo: null } : item
    ));
  };

  const HandleEqualSplit = (itemID) =>  {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemID ? { ...item, equalSplit: !item.equalSplit, assignedTo: null } : item
      )
    );
  };

  const HandleAddDiscount = () => {
    const value = parseFloat(discountInput);
    if (!value || value <= 0) return;
    setDiscount((prev) => [...prev, {
      id: Date.now(),
      value: value,
      type: discountType,
      appliedTo: null,
    }]);
    setDiscountInput("");
  };

  const HandleRemoveDiscount = (discountID) => {
    setDiscount((prev) => 
      prev.map((discount) =>
        discount.id === discountID ? { ...discount, appliedTo: null } : discount
      )
    );
  };

  const HandleDragStart = (e, itemID) => {
    e.dataTransfer.setData("itemID", itemID);
  };

  const HandleDrop = (e, pIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const itemID = Number(e.dataTransfer.getData("itemID"));
    setItems((prev) => 
      prev.map((item) => 
        item.id === itemID ? { ...item, assignedTo: pIndex } : item 
    ));
  };

  const HandleDragEnd = (e, itemID) => {
    if (e.dataTransfer.dropEffect === "none") {
      setItems((prev) => 
        prev.map((item) => 
          item.id === itemID ? { ...item, assignedTo: null } : item
      ));
    }
  };

    const HandleDiscountDragStart = (e, discountID) => {
    e.dataTransfer.setData("discountID", discountID);
  };
  
  const HandleDiscountDrop = (e, target) => {
    e.preventDefault();
    e.stopPropagation();
    const discountID = Number(e.dataTransfer.getData("discountID"));
    setDiscount((prev) =>
      prev.map((discount) =>
        discount.id === discountID ? { ...discount, appliedTo: target } : discount
      )
    );
  };
  
  const HandleDiscountDragEnd = (e, discountID) => {
    if (e.dataTransfer.dropEffect === "none") {
      setDiscount((prev) =>
        prev.map((discount) =>
          discount.id === discountID ? { ...discount, appliedTo: null } : discount
        )
      );
    }
  };

  const HandleConversion = (n, from, to) => {
    if (!n || from === to) return Number(n || 0);
    const rate = rates?.[from]?.[to];
    if (!rate) return 0;
    const result = n * rate;
    return Number(result.toFixed(4));
  };

  const CalculateItemCost = (item) => {
    let cost = item.cost;
    const itemDiscounts = discount.filter(d => d.appliedTo === item.id);
    itemDiscounts.forEach(discount => {
      if (discount.type === "flat") { cost -= discount.value; } 
      else { cost -= (cost * discount.value / 100); }
    });
    return Math.max(0, cost);
  };
  
  const CalculateTotalWithDiscounts = () => {
    let total = items.reduce((sum, item) => sum + CalculateItemCost(item), 0);
    const totalDiscounts = discount.filter(d => d.appliedTo === "total");
    totalDiscounts.forEach(discount => {
      if (discount.type === "flat") { total -= discount.value; } 
      else { total -= (total * discount.value / 100); }
    });
    return Math.max(0, total);
  };

  const HandlePreprocessing = (file) => {
    return new Promise((resolve) => {
      if (!window.cv) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);

          let src = window.cv.imread(canvas);
          const gray = new window.cv.Mat();
          window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);
          
          const scaled = new window.cv.Mat();
          window.cv.resize(gray, scaled, new window.cv.Size(gray.cols * 2, gray.rows * 2), 0, 0, window.cv.INTER_CUBIC);

          const filtered = new window.cv.Mat();
          window.cv.bilateralFilter(scaled, filtered, 9, 75, 75);
            
          const clahe = new window.cv.CLAHE(2.0, new window.cv.Size(8, 8));
          const enhanced = new window.cv.Mat();
          clahe.apply(filtered, enhanced);
            
          const binary = new window.cv.Mat();
          window.cv.adaptiveThreshold(enhanced, binary, 255, window.cv.ADAPTIVE_THRESH_GAUSSIAN_C, window.cv.THRESH_BINARY, 21, 10);
            
          const kernel = window.cv.Mat.ones(2, 2, window.cv.CV_8U);
          const morphed = new window.cv.Mat();
          window.cv.morphologyEx(binary, morphed, window.cv.MORPH_CLOSE, kernel);
            
          const denoised = new window.cv.Mat();
          window.cv.medianBlur(morphed, denoised, 3);
            
          window.cv.imshow(canvas, denoised);
            
          src.delete(); gray.delete(); scaled.delete(); filtered.delete();
          enhanced.delete(); binary.delete(); kernel.delete(); morphed.delete(); denoised.delete();
            
          canvas.toBlob((blob) => resolve(blob), "image/png");
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const HandleReceiptText = (text) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const items = [];

    lines.forEach(line => {
      const upperLine = line.toUpperCase();
      if (IGNORE_KEYWORDS.some(k => upperLine.includes(k))) return;
      if (line.length < 3) return;
      if (/^[\d\s.\-*]+$/.test(line)) return;
      let price = null;
      let priceMatch = null;
      for (const pattern of PRICE_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          const testPrice = parseFloat(match[1]);
          if (testPrice > 0 && testPrice <= 500) {
            price = testPrice;
            priceMatch = match[1];
            break;
          }
        }
      }

      if (!price || !priceMatch) return;

      let name = line.replace(priceMatch, "")
        .replace(/^\d+\s+/, "")                 // Remove leading numbers (quantity)
        .replace(/\s+\d+\s*$/, "")              // Remove trailing numbers
        .replace(/[^\w\s()/-]/g, " ")           // Keep alphanumeric, spaces, (), /, -
        .replace(/\s+/g, " ")                   // Collapse multiple spaces
        .trim();

      if (name.length < 2) return;
      if (/^[A-Z]{1,3}$/.test(name)) return;    // Skip single abbreviations
      if (/^\d+$/.test(name)) return;           // Skip if only numbers remain

      items.push({
        id: Date.now() + Math.random(),
        name,
        cost: price,
        assignedTo: null
      });
    });

    if (items.length) {
      setItems(prev => [...prev, ...items]);
    } else {
      alert("No valid receipt items detected. Try taking a clearer photo or manually add items.");
    }
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
        const viewportWidth = Math.min(window.innerWidth - 40, 600);
        const viewportHeight = Math.min(window.innerHeight - 300, 500);
        const scale = Math.min(viewportWidth / img.width, viewportHeight / img.height, 1);
        setImagePosition({
          x: 0,
          y: 0,
          scale: scale
        });
        const canvasWidth = 600;
        const canvasHeight = 500;
        setBoundingBox({
          x: (canvasWidth - 400) / 2,
          y: (canvasHeight - 300) / 2,
          width: 400,
          height: 300
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const HandleCropMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cornerRadius = 30;
    const corners = [
      { name: 'tl', x: boundingBox.x, y: boundingBox.y },
      { name: 'tr', x: boundingBox.x + boundingBox.width, y: boundingBox.y },
      { name: 'bl', x: boundingBox.x, y: boundingBox.y + boundingBox.height },
      { name: 'br', x: boundingBox.x + boundingBox.width, y: boundingBox.y + boundingBox.height }
    ];
    
    for (const corner of corners) {
      const distance = Math.sqrt(Math.pow(x - corner.x, 2) + Math.pow(y - corner.y, 2));
      if (distance < cornerRadius) {
        setResizingCorner(corner.name);
        return;
      }
    }
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    });
  };

  const HandleCrop = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (resizingCorner) {
      const newBox = { ...boundingBox };
      switch(resizingCorner) {
        case 'tl':
          newBox.width = boundingBox.width + (boundingBox.x - x);
          newBox.height = boundingBox.height + (boundingBox.y - y);
          newBox.x = x;
          newBox.y = y;
          break;
        case 'tr':
          newBox.width = x - boundingBox.x;
          newBox.height = boundingBox.height + (boundingBox.y - y);
          newBox.y = y;
          break;
        case 'bl':
          newBox.width = boundingBox.width + (boundingBox.x - x);
          newBox.height = y - boundingBox.y;
          newBox.x = x;
          break;
        case 'br':
          newBox.width = x - boundingBox.x;
          newBox.height = y - boundingBox.y;
          break;
      }
      
      if (newBox.width > 100 && newBox.height > 100) {
        if (newBox.x >= 0 && newBox.y >= 0 && 
            newBox.x + newBox.width <= canvas.width && 
            newBox.y + newBox.height <= canvas.height) {
          setBoundingBox(newBox);
        }
      }
    } else if (isDragging) {
      setImagePosition(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      }));
    } else {
      const corners = [
        { name: 'tl', x: boundingBox.x, y: boundingBox.y },
        { name: 'tr', x: boundingBox.x + boundingBox.width, y: boundingBox.y },
        { name: 'bl', x: boundingBox.x, y: boundingBox.y + boundingBox.height },
        { name: 'br', x: boundingBox.x + boundingBox.width, y: boundingBox.y + boundingBox.height }
      ];
      
      let onCorner = false;
      for (const corner of corners) {
        const distance = Math.sqrt(Math.pow(x - corner.x, 2) + Math.pow(y - corner.y, 2));
        if (distance < 30) {
          onCorner = true;
          break;
        }
      }
      
      canvas.style.cursor = onCorner ? 'pointer' : 'move';
    }
  };

  const HandleCropMouseUp = () => {
    setIsDragging(false);
    setResizingCorner(null);
  };

  const HandleZoom = (delta) => {
    setImagePosition(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale + delta))
    }));
  };

  const HandleCropConfirm = async() => {
    if (!imageRef.current || !canvasRef.current) return;
    setShowCropModel(false);
    setIsProcessing(true);
    try {
      const img = imageRef.current;
      const boxX = boundingBox.x;
      const boxY = boundingBox.y;
      const boxWidth = boundingBox.width;
      const boxHeight = boundingBox.height;
      const sourceX = (boxX - imagePosition.x) / imagePosition.scale;
      const sourceY = (boxY - imagePosition.y) / imagePosition.scale;
      const sourceWidth = boxWidth / imagePosition.scale;
      const sourceHeight = boxHeight / imagePosition.scale;
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = boxWidth;
      croppedCanvas.height = boxHeight;
      const croppedCtx = croppedCanvas.getContext('2d');
      croppedCtx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, boxWidth, boxHeight);
      const blob = await new Promise(resolve => {
        croppedCanvas.toBlob(resolve, 'image/png');
      });
      const processedImage = await HandlePreprocessing(blob);
      const result = await Tesseract.recognize(processedImage, 'eng', { 
        tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
        preserve_interword_spaces: 1,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,$€-',
      });
      console.log('=== RAW TESSERACT OUTPUT ===');
      console.log(result.data.text);
      console.log('=== END OUTPUT ===');
      HandleReceiptText(result.data.text);
    } catch (error) {
      console.error('OCR Error: ', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const HandleCropCancel = () => {
    setShowCropModel(false);
    setCropImage(null);
  };

  const HandleFileUpload = () => {
    document.getElementById('file-upload').click();
  };

  const HandleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setImagePosition(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, prev.scale + delta))
    }));
  };

  useEffect(() => {
    if (!showCropModel || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.translate(imagePosition.x, imagePosition.y);
      ctx.scale(imagePosition.scale, imagePosition.scale);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, canvas.width, boundingBox.y);
      ctx.fillRect(0, boundingBox.y, boundingBox.x, boundingBox.height);
      ctx.fillRect(boundingBox.x + boundingBox.width, boundingBox.y, canvas.width - boundingBox.x - boundingBox.width, boundingBox.height);
      ctx.fillRect(0, boundingBox.y + boundingBox.height, canvas.width, canvas.height - boundingBox.y - boundingBox.height);
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
      
      const handleSize = 24;
      const corners = [
        { x: boundingBox.x, y: boundingBox.y },
        { x: boundingBox.x + boundingBox.width, y: boundingBox.y },
        { x: boundingBox.x, y: boundingBox.y + boundingBox.height },
        { x: boundingBox.x + boundingBox.width, y: boundingBox.y + boundingBox.height }
      ];
      
      corners.forEach(corner => {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, handleSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    draw();
  }, [showCropModel, imagePosition, boundingBox]);

  useEffect(() => {
    if (!showCropModel || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const wheelHandler = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setImagePosition(prev => ({
        ...prev,
        scale: Math.max(0.1, Math.min(5, prev.scale + delta))
      }));
    };
    canvas.addEventListener('wheel', wheelHandler, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', wheelHandler);
    };
  }, [showCropModel]);

  return (
    <div className='container'>
      <Header/>
      {!showField && ( 
        <button 
          className='new' 
          onClick={() => setShowField(true)}
        >
          Create New Bill
        </button>
      )}
      {showField && (
        <div className='info'>
          <h2> 
            Create New Bill
          </h2>
          <label>
            Bill Name  
          </label>
          <input
            type='text'
            placeholder='e.g. Dinner, Malaysia Day Trip'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label>
            Number of Pax
          </label>
          <input
            type="number"
            min="1"
            value={paxCount}
            onClick={(e) => e.target.select()} 
            onChange={(e) => HandlePaxCount(e.target.value)}
          />
          {nameList.length > 0 && (
            <div className='nameList'>
              <h3>
                Who's in this bill?
              </h3>
              {nameList.map((x, i) => {
                const assignedItems = items.filter((item) => item.assignedTo === i && !item.equalSplit);
                const assignedTotal = assignedItems.reduce((sum, item) => sum + CalculateItemCost(item), 0);
                const splitItems = items.filter((item) => item.equalSplit);
                const splitTotal = splitItems.reduce((sum, item) => sum + CalculateItemCost(item), 0) / nameList.length;
                const paidCurrTotal = assignedTotal + splitTotal;
                const mainCurrTotal = HandleConversion(paidCurrTotal, paidCurrency, mainCurrency);
                return (
                  <div
                    key={i}
                    className='p-container'
                  >
                    <div
                      className={`p-dropzone ${(assignedItems.length > 0 || splitTotal > 0) ? 'has-items' : ''}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => HandleDrop(e, i)}
                    >
                      <div className='p-header'>
                        <input
                          type='checkbox'
                          checked={payer === i}
                          onChange={(e) => setPayer(e.target.checked ? i : "")}
                        />
                        <input
                          type='text'
                          placeholder={`Person ${i + 1}`}
                          value={x}
                          onChange={(e) => HandleNameList(i, e.target.value)}
                        />
                        {payer === i && <span className='payer-tag'>PAYER</span>}
                      </div>
                      {(assignedItems.length > 0 || splitTotal > 0) && (
                        <div className='p-items'>
                          {assignedItems.length > 0 && (
                            <>
                              <div className='p-items-tag'>Assigned Items ({assignedItems.length})</div>
                              {assignedItems.map((item) => {
                                const itemDiscounts = discount.filter(d => d.appliedTo === item.id);
                                return (
                                  <div 
                                    key={item.id} 
                                    className='assigned-item-wrapper'
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => HandleDiscountDrop(e, item.id)}
                                  >
                                    <div 
                                      className='assigned-item'
                                      draggable
                                      onDragStart={(e) => HandleDragStart(e, item.id)}
                                      onDragEnd={(e) => HandleDragEnd(e, item.id)}
                                    >
                                      <span>{item.name} — {paidCurrency} {CalculateItemCost(item).toFixed(2)}</span>
                                      <button className='remove-btn' onClick={() => HandleRemoveItem(item.id)}>
                                        Remove
                                      </button>
                                    </div>
                                    {itemDiscounts.length > 0 && (
                                      <div className='item-discounts'>
                                        {itemDiscounts.map((discount) => (
                                          <div key={discount.id} className='item-discount-tag'>
                                            <span>
                                              {discount.type === "flat" 
                                                ? `${paidCurrency} ${discount.value.toFixed(2)}` 
                                                : `${discount.value}%`} OFF
                                            </span>
                                            <button onClick={() => HandleRemoveDiscount(discount.id)}>×</button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </>
                          )}
                          {splitTotal > 0 && (
                            <>
                              <div className='p-items-tag split-tag'>Split Items Share</div>
                              <div className='split-share'>
                                {paidCurrency} {splitTotal.toFixed(2)}
                              </div>
                            </>
                          )}
                          
                          <div className='p-total'>
                            Total: {mainCurrency} {mainCurrTotal.toFixed(2)}
                            {paidCurrency !== mainCurrency && (
                              <div className='p-total-breakdown'>
                                ({paidCurrency} {paidCurrTotal.toFixed(2)})
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      {nameList.length > 0 && (
        <div className='details'>
          <h3>
            Bill Details
          </h3>
          <label>
            Main Currency
          </label>
          <select
            value={mainCurrency}
            onChange={(e) => setMainCurrency(e.target.value)}
          >
            {CURRENCIES.map((curr) => (
              <option 
                key={curr}
                value={curr}
              >
                {curr}
              </option>
            ))}
          </select>
          <label>
            Currency Paid In
          </label>
          <select
            value={paidCurrency}
            onChange={(e) => setPaidCurrency(e.target.value)}
          >
            {CURRENCIES.map((cur) => (
              <option key={cur} value={cur}>
                {cur}
              </option>
            ))}
          </select>
          <label>
            Add Item
          </label>
          <div className='addItem'>
            <input
              type='text'
              value={itemInput}
              placeholder='Item Cost / Cost Item / ItemCost / CostItem'
              onChange={(e) => setItemInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && HandleAddItem()}
            />
            <button onClick={HandleAddItem}> 
              Add 
            </button>
          </div>
          <label>Add Discount</label>
          <div className='addDiscount'>
            <input
              type='number'
              value={discountInput}
              placeholder='Amount'
              onChange={(e) => setDiscountInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && HandleAddDiscount()}
            />
            <select 
              value={discountType} 
              onChange={(e) => setDiscountType(e.target.value)}
            >
              <option value="flat"> Flat </option>
              <option value="percentage"> % </option>
            </select>
            <button onClick={HandleAddDiscount}> Add </button>
          </div>
          {discount.some((d) => d.appliedTo === null) && (
            <div className='discounts'>
              <h3>Unassigned Discounts (Drag to item or total)</h3>
              {discount
                .filter((discount) => discount.appliedTo === null)
                .map((discount) => (
                  <div 
                    key={discount.id} 
                    className='discount-item'
                    draggable
                    onDragStart={(e) => HandleDiscountDragStart(e, discount.id)}
                    onDragEnd={(e) => HandleDiscountDragEnd(e, discount.id)}
                  >
                    <span>
                      {discount.type === "flat" ? `${paidCurrency} ${discount.value.toFixed(2)}` : `${discount.value}%`} OFF
                    </span>
                  </div>
                ))
              }
            </div>
          )}
          {items.length > 0 && (
            <div 
              className='total-bill-section'
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => HandleDiscountDrop(e, "total")}
            >
              <h3>Total Bill Summary</h3>
              <div className='bill-summary'>
                <div className='summary-row'>
                  <span>Subtotal:</span>
                  <span>{paidCurrency} {items.reduce((sum, item) => sum + item.cost, 0).toFixed(2)}</span>
                </div>
                
                {discount.filter(d => d.appliedTo === "total").length > 0 && (
                  <div className='applied-discounts'>
                    {discount.filter(d => d.appliedTo === "total").map((discount) => (
                      <div key={discount.id} className='summary-row discount-row'>
                        <span>
                          Discount ({discount.type === "flat" 
                            ? `${paidCurrency} ${discount.value.toFixed(2)}` 
                            : `${discount.value}%`}):
                        </span>
                        <span className='discount-amount'>
                          -{paidCurrency} {
                            discount.type === "flat" 
                              ? discount.value.toFixed(2)
                              : ((items.reduce((sum, item) => sum + CalculateItemCost(item), 0) * discount.value / 100).toFixed(2))
                          }
                          <button 
                            className='remove-discount-btn'
                            onClick={() => HandleRemoveDiscount(discount.id)}
                          >
                            ×
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className='summary-row total-row'>
                  <span>Total:</span>
                  <strong>
                    {paidCurrency} {CalculateTotalWithDiscounts().toFixed(2)}
                    {paidCurrency !== mainCurrency && (
                      <span className='converted-total'>
                        {' '}({mainCurrency} {HandleConversion(CalculateTotalWithDiscounts(), paidCurrency, mainCurrency).toFixed(2)})
                      </span>
                    )}
                  </strong>
                </div>
              </div>
            </div>
          )}
          <label>
            Or Scan Receipt
          </label>
          <div className='scan'>
            <button
              className='scan-button'
              // OnClick
              disabled={isProcessing}
            >
              📷 Take Photo
            </button>
            <button
              className='scan-button'
              onClick={HandleFileUpload}
              disabled={isProcessing}
            >
              📁 Upload Image
            </button>  
          </div>
          <input
            id='file-upload'
            type='file'
            accept='image/*'
            onChange={HandleImageSelect}
            style={{ display: 'none' }}
          />
          {items.some((i) => i.assignedTo === null && !i.equalSplit) && (
            <div className='items'>
              <h3>Unassigned Items (Drag to assign)</h3>
              {items
                .filter((item) => item.assignedTo === null && !item.equalSplit)
                .map((item) => {
                  const itemDiscounts = discount.filter(d => d.appliedTo === item.id);
                  return (
                    <div 
                      key={item.id} 
                      className='item'
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => HandleDiscountDrop(e, item.id)}
                    >
                      <div 
                        className='item-main'
                        draggable
                        onDragStart={(e) => HandleDragStart(e, item.id)}
                        onDragEnd={(e) => HandleDragEnd(e, item.id)}
                      >
                        <span>{item.name} — {paidCurrency} {CalculateItemCost(item).toFixed(2)}</span>
                        <label className='split-checkbox'>
                          <input
                            type='checkbox'
                            checked={item.equalSplit}
                            onChange={() => HandleEqualSplit(item.id)}
                          />
                          Split Equally
                        </label>
                      </div>
                      
                      {itemDiscounts.length > 0 && (
                        <div className='item-discounts'>
                          {itemDiscounts.map((discount) => (
                            <div key={discount.id} className='item-discount-tag'>
                              <span>
                                {discount.type === "flat" 
                                  ? `${paidCurrency} ${discount.value.toFixed(2)}` 
                                  : `${discount.value}%`} OFF
                              </span>
                              <button onClick={() => HandleRemoveDiscount(discount.id)}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              }
            </div>
          )}
          
          {items.some((i) => i.equalSplit) && (
            <div className='items split-items-section'>
              <h3>Split Equally Items</h3>
              {items
                .filter((item) => item.equalSplit)
                .map((item) => {
                  const itemDiscounts = discount.filter(d => d.appliedTo === item.id);
                  return (
                    <div 
                      key={item.id} 
                      className='item split-item'
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => HandleDiscountDrop(e, item.id)}
                    >
                      <div className='item-main'>
                        <span>{item.name} — {paidCurrency} {CalculateItemCost(item).toFixed(2)}</span>
                        <label className='split-checkbox'>
                          <input
                            type='checkbox'
                            checked={item.equalSplit}
                            onChange={() => HandleEqualSplit(item.id)}
                          />
                          Split Equally
                        </label>
                      </div>
                      
                      {itemDiscounts.length > 0 && (
                        <div className='item-discounts'>
                          {itemDiscounts.map((discount) => (
                            <div key={discount.id} className='item-discount-tag'>
                              <span>
                                {discount.type === "flat" 
                                  ? `${paidCurrency} ${discount.value.toFixed(2)}` 
                                  : `${discount.value}%`} OFF
                              </span>
                              <button onClick={() => HandleRemoveDiscount(discount.id)}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              }
            </div>
          )}
        </div>
      )}
      {showCropModel && (
        <div 
          className='crop-model'
          onMouseMove={HandleCrop}
          onMouseUp={HandleCropMouseUp}
          onMouseLeave={HandleCropMouseUp}
        >
          <div className='crop-content'>
            <h3>
              Position Your Items
            </h3>
            <p>
              Drag the image to position the items within the box
            </p>
            <canvas
              ref={canvasRef}
              width={600}
              height={500}
              className='crop-canvas'
              onMouseDown={HandleCropMouseDown}
            />
            <div className='crop-controls'>
              <button onClick={() => HandleZoom(-0.2)}>
                Zoom Out
              </button>
              <span className='zoom-level'>{Math.round(imagePosition.scale * 100)}%</span>
              <button onClick={() => HandleZoom(0.2)}>
                Zoom In
              </button>
            </div>
            <div className='crop-actions'>
              <button 
                onClick={HandleCropCancel} 
                className='cancel-btn'
              >
                Cancel
              </button>
              <button 
                onClick={HandleCropConfirm} 
                className='confirm-btn'
              >
                Process Receipt
              </button>
            </div>
          </div>
        </div>
      )}
      {isProcessing && (
        <div className='processing'>
          <div className='processing-bar'>
            <p> 
              Processing Image...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
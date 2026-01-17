import { CURRENCIES } from '../utilities/constants';

function BillDetails({
    mainCurrency,
    paidCurrency,
    itemInput,
    discountInput,
    discountType,
    isProcessing,
    onMainCurrencyChange,
    onPaidCurrencyChange,
    onItemInputChange,
    onAddItem,
    onDiscountInputChange,
    onDiscountTypeChange,
    onAddDiscount,
    onFileUpload,
}) {
    return (
        <div className='details'>
            <h3> Bill Details </h3>

            <label> Main Currency </label>
            <select
                value={mainCurrency}
                onChange={e => onMainCurrencyChange(e.target.value)}
            >
                {CURRENCIES.map((curr) => (
                    <option key={curr} value={curr}>
                        {curr}
                    </option>
                ))}
            </select>

            <label> Currency Paid In </label>
            <select
                value={paidCurrency}
                onChange={e => onPaidCurrencyChange(e.target.value)}
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

            <label> Add Item </label>
            <div className='addItem'>
                <input
                    type='text'
                    value={itemInput}
                    placeholder='Item Cost / Cost Item / ItemCost / CostItem'
                    onChange={e => onItemInputChange(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && onAddItem()}
                />
                <button onClick={onAddItem}> Add </button>
            </div>

            <label> Add Discount </label>
            <div className='addDiscount'>
                <input
                    type='number'
                    value={discountInput}
                    placeholder='Amount'
                    onChange={e => onDiscountInputChange(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && onAddDiscount()}
                />
                <select 
                    value={discountType} 
                    onChange={e => onDiscountTypeChange(e.target.value)}
                >
                    <option value="flat"> Flat </option>
                    <option value="percentage"> % </option>
                </select>
                <button onClick={onAddDiscount}> Add </button>
            </div>

            <label>Or Scan Receipt</label>
            <div className='scan'>
                <button
                    className='scan-button'
                    disabled={isProcessing}
                >
                    📷 Take Photo
                </button>
                <button
                    className='scan-button'
                    onClick={onFileUpload}
                    disabled={isProcessing}
                >
                    📁 Upload Image
                </button>
            </div>
        </div>
    );
}

export default BillDetails;
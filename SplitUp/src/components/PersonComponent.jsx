function Person({ 
    index, 
    name, 
    isPayer, 
    assignedItems, 
    splitTotal, 
    mainCurrency, 
    mainCurrencyTotal, 
    paidCurrency, 
    paidCurrencyTotal, 
    onDrop, 
    onNameChange, 
    onPayerChange, 
    children 
}) {
    return (
        <div className="p-container">
            <div
                className={`p-dropzone ${(assignedItems.length > 0 || splitTotal > 0) ? 'has-items' : ''}`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDrop(e, index)}
            >
                <div className="p-header">
                    <input
                        type='checkbox'
                        checked={isPayer}
                        onChange={e => onPayerChange(e.target.checked ? index : "")}
                    />
                    <input
                        type="text"
                        placeholder={`Person ${index + 1}`}
                        value={name}
                        onChange={e => onNameChange(index, e.target.value)}
                    />
                    {isPayer && <span className="payer-tag"> PAYER </span>} 
                </div>
                {children}
                {(assignedItems.length > 0 || splitTotal > 0) && (
                    <div className="p-total">
                        Total: {mainCurrency} {mainCurrencyTotal.toFixed(2)}
                        {paidCurrency !== mainCurrency && (
                        <div className="p-total-breakdown">
                            ({paidCurrency} {paidCurrencyTotal.toFixed(2)})
                        </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Person;
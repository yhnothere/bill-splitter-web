function BillInfo({ showField, title, paxCount, onCreate, onTitleChange, onPaxChange, children }) {
    if (!showField) {
        return (
            <button 
                className='new' 
                onClick={onCreate}
            >
                Create New Bill
            </button>
        );
    }
    return (
        <div className="info">
            <h2> Create New Bill </h2>
            <label> Bill Name </label>
            <input
                type="text"
                placeholder="e.g. Breakfast, Drinks, Day Trip"
                value={title}
                onChange={e => onTitleChange(e.target.value)}
            />
            <label> Number of Pax </label>
            <input
                type="number"
                min="1"
                value={paxCount}
                onClick={e => e.target.select()} 
                onChange={e => onPaxChange(e.target.value)}
            />
            {children}
        </div>
    );
}

export default BillInfo;
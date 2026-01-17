function Assigned({
    assignedItems,
    splitTotal,
    costCalculation,
    paidCurrency,
    discount,
    onDragStart,
    onDragEnd,
    onDiscountDrop,
    onRemoveItem,
    onRemoveDiscount,
}) {
    if (assignedItems.length === 0 && splitTotal <= 0) return null;
    return (
        <div className="p-items">
            {assignedItems.length > 0 && (
            <>
                <div className="p-items-tag">
                    Assigned Items ({assignedItems.length})
                </div>
                {assignedItems.map((item) => {
                    const itemDiscounts = discount.filter((d) => d.appliedTo === item.id);
                    return (
                        <div
                          key={item.id}
                          className="assigned-item-wrapper"
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => onDiscountDrop(e, item.id)}
                        >
                            <div
                              className="assigned-item"
                              draggable
                              onDragStart={e => onDragStart(e, item.id)}
                              onDragEnd={e => onDragEnd(e, item.id)}
                            >
                                <span>
                                    {item.name} — {paidCurrency}{' '}
                                    {costCalculation(item).toFixed(2)}
                                </span>
                                <button
                                    className="remove-btn"
                                    onClick={() => onRemoveItem(item.id)}
                                >
                                    Remove
                                </button>
                            </div>
                            {itemDiscounts.length > 0 && (
                                <div className="item-discounts">
                                    {itemDiscounts.map((discount) => (
                                        <div
                                            key={discount.id}
                                            className="item-discount-tag"
                                        >
                                            <span>
                                                {discount.type === 'flat' ? `${paidCurrency} ${discount.value.toFixed(2)}` : `${discount.value}%`}{' '}
                                                OFF
                                            </span>
                                            <button onClick={() => onRemoveDiscount(discount.id)}>
                                                x
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </>
            )}
            {splitTotal > 0 && (
            <>
                <div className="p-items-tag split-tag">
                    Split Items Share
                </div>
                <div className="split-share">
                    {paidCurrency} {splitTotal.toFixed(2)}
                </div>
            </>
            )}
        </div>
    );
}

export default Assigned;
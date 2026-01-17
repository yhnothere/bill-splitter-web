import Person from "./PersonComponent";
import Assigned from "./AssignedComponent";

function NameList({
    nameList,
    itemList,
    payer,
    mainCurrency,
    paidCurrency,
    discount,
    costCalculation,
    costConversion,
    onNameChange,
    onPayerChange,
    onDragStart,
    onDragEnd,
    onItemDrop,
    onDiscountDrop,
    onItemRemove,
    onDiscountRemove
}) {
    if (!nameList.length) return null;
    return (
    <div className="nameList">
      <h3> Who's in this bill? </h3>
      {nameList.map((name, i) => {
        const assignedItems = itemList.filter((item) => item.assignedTo === i && !item.equalSplit);
        const assignedTotal = assignedItems.reduce((sum, item) => sum + costCalculation(item), 0);
        const splitItems = itemList.filter((item) => item.equalSplit);
        const splitTotal = splitItems.reduce((sum, item) => sum + costCalculation(item), 0) / nameList.length;
        const paidCurrencyTotal = assignedTotal + splitTotal;
        const mainCurrencyTotal = costConversion(paidCurrencyTotal, paidCurrency, mainCurrency);
        return (
          <Person
            key={i}
            index={i}
            name={name}
            isPayer={payer === i}
            assignedItems={assignedItems}
            splitTotal={splitTotal}
            mainCurrency={mainCurrency}
            mainCurrencyTotal={mainCurrencyTotal}
            paidCurrency={paidCurrency}
            paidCurrencyTotal={paidCurrencyTotal}
            onDrop={onItemDrop}
            onNameChange={onNameChange}
            onPayerChange={onPayerChange}
          >
            <Assigned
              assignedItems={assignedItems}
              splitTotal={splitTotal}
              costCalculation={costCalculation}
              paidCurrency={paidCurrency}
              discount={discount}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDiscountDrop={onDiscountDrop}
              onRemoveItem={onItemRemove}
              onRemoveDiscount={onDiscountRemove}
            />
          </Person>
        );
      })}
    </div>
  );
}

export default NameList;
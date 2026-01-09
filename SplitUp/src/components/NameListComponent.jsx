import Person from "./PersonComponent";

function NameList({
    nameList,
    itemList,
    costCalculation,
    costConversion,
    discount,
    payer,
    mainCurrency,
    paidCurrency,
    onDrop,
    onNameChange,
    onPayerChange
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
          <PersonCard
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
            onDrop={onDrop}
            onNameChange={onNameChange}
            onPayerChange={onPayerChange}
          >
            {/* Assigned items UI stays in App for now */}
          </PersonCard>
        );
      })}
    </div>
  );
}

export default NameList;
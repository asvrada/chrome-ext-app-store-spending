import { Currency, Purchase, PurchaseDay, PurchaseHistory } from "./classes.js";
import { roundToTwo } from "./helper.js";

/**
 * Filter out free purchases/items
 */
class FreeItemFilter {
    constructor() {
    }

    /**
     * Filter out free purchases/items IN PLACE
     * @param {PurchaseHistory} purchaseHistory 
     * @returns {PurchaseHistory} The same object, but with free purchases/items filtered out
     */
    filter(purchaseHistory) {
        /** @type {Array<PurchaseDay>} */
        const newPurchaseDays = [];
        const oldPurchaseDays = purchaseHistory.days;

        for (const purchaseDay of oldPurchaseDays) {
            /** @type {Array<Item>} */
            const newItems = [];
            const oldItems = purchaseDay.items;

            for (const item of oldItems) {
                if (item.amountPaid.amount > 0.01) {
                    newItems.push(item);
                }
            }

            if (newItems.length > 0) {
                const newPurchaseDay = new PurchaseDay();
                newPurchaseDay.date = purchaseDay.date;
                newPurchaseDay.totalAmount = purchaseDay.totalAmount;
                newPurchaseDay.items = newItems;

                newPurchaseDays.push(newPurchaseDay);
            }
        }

        // Replace the old with the new one
        purchaseHistory.days = newPurchaseDays;
    }
}

/**
 * Flatten the purchase history into a single purchase entry for each item
 */
class SingleEntryConverter {
    constructor() {
        /** @type {Array<Purchase>} */
        this.purchases = [];
    }

    /**
     * @param {PurchaseHistory} purchaseHistory
     * @returns {Array<Purchase>} Array of purchases
     */
    convert(purchaseHistory) {
        for (const purchaseDay of purchaseHistory.days) {
            this.handleDay(purchaseDay);
        }

        return this.purchases;
    }

    /**
     * Split purchases from a single day into individual purchases
     * @param {PurchaseDay} purchaseDay 
     */
    handleDay(purchaseDay) {
        const totalAmountAfterTax = purchaseDay.totalAmount.amount;
        const totalAmountPreTax = purchaseDay.items.reduce((acc, item) => acc + item.amountPaid.amount, 0);
        const tax = totalAmountAfterTax - totalAmountPreTax;

        for (const item of purchaseDay.items) {
            const purchase = new Purchase();
            purchase.date = purchaseDay.date;
            purchase.name = item.name;
            purchase.type = item.type;

            purchase.amountPaid = new Currency();
            purchase.amountPaid.currency = item.amountPaid.currency;
            purchase.amountPaid.amount = roundToTwo(item.amountPaid.amount
                + (tax * (item.amountPaid.amount / totalAmountPreTax)));

            this.purchases.push(purchase);
        }
    }
}

class TotalAmountAggregator {
    constructor() {
        /** @type {Map<string, number>} Track amount for each currency */
        this.mapCurrencyAmount = new Map();
    }

    /**
     * 
     * @param {Array<Purchase>} purchases Array of purchases (result from SingleEntryConverter)
     * @returns {Map<string, number>}
     */
    aggregate(purchases) {
        purchases.forEach((each) => {
            const currency = each.amountPaid.currency;
            const amount = each.amountPaid.amount;

            if (this.mapCurrencyAmount.get(currency) === undefined) {
                this.mapCurrencyAmount.set(currency, 0);
            }

            this.mapCurrencyAmount.set(currency, this.mapCurrencyAmount.get(currency) + amount);
        });

        // Round numbers
        const mapRoundedNumber = new Map();
        this.mapCurrencyAmount.forEach((v, k) => {
            mapRoundedNumber.set(k, roundToTwo(v));
        });
        this.mapCurrencyAmount = mapRoundedNumber;

        return this.mapCurrencyAmount;
    }
}

export {
    FreeItemFilter,
    SingleEntryConverter,
    TotalAmountAggregator
}


export const getExchangeRate = async (from: string, to: string = 'TWD'): Promise<number | null> => {
    if (from === to) return 1;
    try {
        // Using open.er-api.com (Open Exchange Rates wrapper) which reliably supports standard currencies
        const response = await fetch(`https://open.er-api.com/v6/latest/${from}`);
        const data = await response.json();

        if (data.result === 'success' && data.rates && data.rates[to]) {
            return data.rates[to];
        }
        return null;
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        return null;
    }
};

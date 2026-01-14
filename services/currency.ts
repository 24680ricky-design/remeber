
export const getExchangeRate = async (from: string, to: string = 'TWD'): Promise<number | null> => {
    if (from === to) return 1;
    try {
        const response = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
        const data = await response.json();
        return data.rates[to];
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        return null;
    }
};

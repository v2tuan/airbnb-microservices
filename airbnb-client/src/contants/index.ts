export const formatPrice = (price: number, currency: string) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: currency }).format(price);
}
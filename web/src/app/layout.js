import './globals.css';

export const metadata = {
  title: 'MACE | Epic Industrial Certified Payroll',
  description: 'Fringe rate and union benefits reporting for certified payroll',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

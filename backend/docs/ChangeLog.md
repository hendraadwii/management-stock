# Change Log

## v1.0.0 - Initial Release (2026-06-21)

### Added
- Initial project setup with Next.js 16 + TypeScript + Tailwind CSS
- Authentication system (Login/Logout) with Supabase Auth
- Role-based access control (Admin & User roles)
- Dashboard with summary cards (Total Barang, Total Stock, DO Bulan Ini)
- Master data management:
  - Master Kategori (CRUD)
  - Master Rak (CRUD)
  - Master Barang (CRUD with category/rack selection)
  - Master User (CRUD) - Admin only
- Transactions:
  - Stock Masuk (Stock In) with automatic stock update
  - Delivery Order with item validation & stock reduction
  - Auto-generated DO number format: ASTEK/YYYY/MM/XXXX
  - Stock validation before transaction
- Reports:
  - Stock Report with search, sort, pagination, export Excel
  - Delivery Order Report with date filter, search, export Excel
- Stock History page showing all stock movements
- Settings page (Change Password)
- Responsive sidebar (desktop fixed, mobile hamburger)
- Reusable DataTable component with search, sort, pagination
- Supabase database schema with RLS policies
- Seed data for testing

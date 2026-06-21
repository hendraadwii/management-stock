# Stock Management System

## Project Overview

Stock Management System adalah aplikasi berbasis web untuk mengelola data stok barang, transaksi barang masuk, dan Delivery Order (DO).

Aplikasi ditujukan untuk kebutuhan internal perusahaan agar proses pencatatan stok menjadi lebih terstruktur, cepat, dan mudah diakses.

---

# Project Goals

* Responsive di Desktop, Tablet, dan Mobile
* UI modern, clean, dan tidak kaku
* Ringan dan cepat diakses
* Mudah digunakan user non-teknis
* Tidak membutuhkan VPS
* Mudah dikembangkan di masa depan

---

# Technology Stack

## Frontend

* Next.js 15
* TypeScript
* Tailwind CSS
* Shadcn UI
* TanStack Table
* React Hook Form
* Zod

## Backend

* Supabase

  * PostgreSQL
  * Authentication
  * Row Level Security (RLS)

## Deployment

* Frontend : Vercel
* Backend : Supabase Cloud

---

# Project Structure

```text
stock-management/

├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   ├── master/
│   │   │   │   ├── items/
│   │   │   │   ├── categories/
│   │   │   │   ├── racks/
│   │   │   │   └── users/
│   │   │   ├── transactions/
│   │   │   │   ├── stock-in/
│   │   │   │   └── delivery-order/
│   │   │   ├── reports/
│   │   │   │   ├── stock/
│   │   │   │   └── delivery-order/
│   │   │   └── settings/
│   │   │
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types/
│   │   └── middleware.ts
│   │
│   ├── package.json
│   └── next.config.ts
│
├── backend/
│   ├── supabase/
│   │   ├── migrations/
│   │   ├── seed/
│   │   └── policies/
│   │
│   ├── database/
│   └── docs/
│
├── docs/
│   ├── Requirement.md
│   ├── DatabaseSchema.md
│   └── ChangeLog.md
│
└── README.md
```

---

# User Roles

## Admin

Hak akses:

* Login
* Dashboard
* Master Barang
* Master Kategori
* Master Rak
* Master User
* Input Stock Masuk
* Membuat Delivery Order
* Export Excel
* Melihat Laporan

---

## User

Hak akses:

* Login
* Melihat Stock
* Search Stock

Tidak dapat:

* Menambah data
* Mengubah data
* Menghapus data
* Membuat Delivery Order

---

# Authentication

## Login

Field:

* Username
* Password

Ketentuan:

* User tidak dapat registrasi sendiri
* User dibuat oleh Admin

---

# Dashboard

Menampilkan ringkasan:

* Total Barang
* Total Stock
* Total Delivery Order Bulan Berjalan

Dashboard dibuat sederhana tanpa chart yang kompleks.

---

# Master Data

## Master Kategori

Field:

* Nama Kategori

Contoh:

* Hose
* Bolt
* Nut

---

## Master Rak

Field:

* Kode Rak
* Deskripsi

Contoh:

* RAK-A1
* RAK-A2
* RAK-B1

---

## Master Barang

Field:

* Part Number
* Nama Barang
* Kategori
* Rak
* Current Stock

Contoh:

| Part Number | Nama Barang | Kategori | Rak    |
| ----------- | ----------- | -------- | ------ |
| 001/012     | Hose Assy   | Hose     | RAK-A1 |

---

# Transaksi

## Stock Masuk

Digunakan untuk menambah stock barang.

Field:

* Tanggal
* Part Number
* Qty Masuk
* Keterangan (Optional)

Flow:

1. Pilih Barang
2. Input Qty Masuk
3. Simpan

System akan otomatis menambahkan stock.

Formula:

Current Stock + Qty Masuk

---

## Delivery Order

Digunakan untuk mengurangi stock barang.

### Header

Field:

* Nomor DO
* Nomor PO
* Tanggal
* Shipping

### Format Nomor DO

Format:

ASTEK/YYYY/MM/XXXX

Contoh:

ASTEK/2026/06/0001

ASTEK/2026/06/0002

Nomor urut reset setiap bulan.

---

### Detail Item

Field:

* Part Number
* Kategori
* Rak
* Qty Keluar

Fitur:

* Tambah Baris
* Hapus Baris

---

## Validasi Stock

System harus menolak transaksi apabila stock tidak mencukupi.

Contoh:

Stock = 5

Qty Keluar = 10

Result:

Stock tidak mencukupi.

---

## Pengurangan Stock

Saat Delivery Order disimpan:

Current Stock - Qty Keluar

Contoh:

Stock = 100

Qty Keluar = 2

Stock Akhir = 98

---

# Laporan

## Stock Report

Menampilkan:

* Part Number
* Nama Barang
* Kategori
* Rak
* Current Stock

Fitur:

* Search
* Sort
* Pagination
* Export Excel

---

## Delivery Order Report

Menampilkan:

* Nomor DO
* Nomor PO
* Tanggal
* Shipping

Fitur:

* Filter Tanggal
* Search
* Export Excel

---

# Stock History

Digunakan untuk melihat histori pergerakan stock.

Jenis transaksi:

* Stock In
* Delivery Order

Informasi:

* Tanggal
* Part Number
* Jenis Transaksi
* Qty
* User

---

# Database Tables

## users

* id
* username
* password
* role
* created_at

## categories

* id
* name

## racks

* id
* rack_code
* description

## items

* id
* part_number
* item_name
* category_id
* rack_id
* current_stock

## stock_in

* id
* item_id
* qty
* created_at
* created_by

## delivery_orders

* id
* do_number
* po_number
* shipping
* created_at
* created_by

## delivery_order_details

* id
* delivery_order_id
* item_id
* qty

## stock_movements

* id
* item_id
* movement_type
* qty
* reference_number
* created_at

---

# UI / UX Guidelines

## Design Style

* Modern
* Clean
* Minimalist
* Soft Shadow
* Rounded Corner
* Professional

---

## Responsive

Desktop:

* Sidebar tetap di kiri

Mobile:

* Sidebar menjadi hamburger menu

---

## Table

* Sticky Header
* Search
* Pagination
* Responsive

---

## Form

* Searchable Dropdown
* Realtime Validation
* User Friendly

---

# Future Enhancement

* Print Delivery Order PDF
* Barcode Scanner
* Stock Adjustment
* Stock Opname
* Multi Warehouse
* Upload Attachment
* Dashboard Analytics

---

# Non Functional Requirements

* Fast Loading
* Mobile Friendly
* Secure Authentication
* Easy Maintenance
* Cloud Based
* Production Ready
* No VPS Required
* Deploy menggunakan Vercel dan Supabase

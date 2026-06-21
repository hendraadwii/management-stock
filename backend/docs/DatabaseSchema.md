# Database Schema

## Tables

### users
| Column     | Type         | Constraints                |
|------------|--------------|----------------------------|
| id         | UUID         | PK, REFERENCES auth.users  |
| username   | VARCHAR(100) | UNIQUE, NOT NULL           |
| role       | VARCHAR(10)  | CHECK (admin, user)        |
| created_at | TIMESTAMPTZ  | DEFAULT NOW()              |

### categories
| Column     | Type         | Constraints       |
|------------|--------------|-------------------|
| id         | UUID         | PK, DEFAULT uuid  |
| name       | VARCHAR(200) | NOT NULL          |
| created_at | TIMESTAMPTZ  | DEFAULT NOW()     |

### racks
| Column     | Type         | Constraints       |
|------------|--------------|-------------------|
| id         | UUID         | PK, DEFAULT uuid  |
| rack_code  | VARCHAR(50)  | UNIQUE, NOT NULL  |
| description| TEXT         | NULLABLE          |
| created_at | TIMESTAMPTZ  | DEFAULT NOW()     |

### items
| Column       | Type         | Constraints                     |
|--------------|--------------|---------------------------------|
| id           | UUID         | PK, DEFAULT uuid                |
| part_number  | VARCHAR(100) | UNIQUE, NOT NULL                |
| item_name    | VARCHAR(200) | NOT NULL                        |
| category_id  | UUID         | FK -> categories(id)            |
| rack_id      | UUID         | FK -> racks(id)                 |
| current_stock| INTEGER      | NOT NULL, DEFAULT 0, CHECK >= 0 |
| created_at   | TIMESTAMPTZ  | DEFAULT NOW()                   |

### stock_in
| Column     | Type         | Constraints       |
|------------|--------------|-------------------|
| id         | UUID         | PK, DEFAULT uuid  |
| item_id    | UUID         | FK -> items(id)   |
| qty        | INTEGER      | CHECK > 0         |
| note       | TEXT         | NULLABLE          |
| created_at | TIMESTAMPTZ  | DEFAULT NOW()     |
| created_by | UUID         | FK -> users(id)   |

### delivery_orders
| Column     | Type         | Constraints       |
|------------|--------------|-------------------|
| id         | UUID         | PK, DEFAULT uuid  |
| do_number  | VARCHAR(50)  | UNIQUE, NOT NULL  |
| po_number  | VARCHAR(100) | NOT NULL          |
| shipping   | VARCHAR(200) | NOT NULL          |
| created_at | TIMESTAMPTZ  | DEFAULT NOW()     |
| created_by | UUID         | FK -> users(id)   |

### delivery_order_details
| Column           | Type    | Constraints                  |
|------------------|---------|------------------------------|
| id               | UUID    | PK, DEFAULT uuid             |
| delivery_order_id| UUID    | FK -> delivery_orders(id)    |
| item_id          | UUID    | FK -> items(id)              |
| qty              | INTEGER | CHECK > 0                    |

### stock_movements
| Column          | Type         | Constraints                          |
|-----------------|--------------|--------------------------------------|
| id              | UUID         | PK, DEFAULT uuid                     |
| item_id         | UUID         | FK -> items(id)                      |
| movement_type   | VARCHAR(20)  | CHECK (stock_in, delivery_order)     |
| qty             | INTEGER      | CHECK > 0                            |
| reference_number| VARCHAR(100) | NULLABLE                             |
| created_at      | TIMESTAMPTZ  | DEFAULT NOW()                        |

## Relationships

- items -> categories (Many-to-One)
- items -> racks (Many-to-One)
- stock_in -> items (Many-to-One)
- delivery_orders -> users (Many-to-One)
- delivery_order_details -> delivery_orders (Many-to-One, CASCADE)
- delivery_order_details -> items (Many-to-One)
- stock_movements -> items (Many-to-One)

## Row Level Security (RLS)

- All tables have RLS enabled
- Users can read their own profile
- Admins have full CRUD access to all tables
- Regular users have read-only access to items, categories, racks, and reports

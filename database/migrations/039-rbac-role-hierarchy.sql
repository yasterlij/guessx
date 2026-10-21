-- RBAC Role Hierarchy & Organizational Structure
-- Enterprise-grade role hierarchy modeled after Awash Bank / Awash Birr Wallet
-- Supports: CEO, CXO, Director, Manager, Expert, Specialist, Analyst

-- ============================================================
-- 1. EXTEND USER ROLE (role is VARCHAR, not enum - update existing values)
-- ============================================================

-- The role column is VARCHAR(20), so new values are automatically supported.
-- No ALTER TYPE needed. Just ensure the application recognizes the new roles.
-- New roles: CEO, CXO, DIRECTOR, MANAGER, EXPERT, SPECIALIST, ANALYST

-- ============================================================
-- 2. ORGANIZATIONAL STRUCTURE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS divisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    head_user_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    head_user_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE(division_id, code)
);

CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    description TEXT,
    head_user_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE(department_id, code)
);

-- ============================================================
-- 3. USER ORGANIZATIONAL ASSIGNMENT
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES divisions(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id);

-- ============================================================
-- 4. DYNAMIC PERMISSION OVERRIDES (TEMPORARY ELEVATED ACCESS)
-- ============================================================

CREATE TABLE IF NOT EXISTS permission_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES users(id),
    permissions JSONB NOT NULL,
    reason VARCHAR(500),
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP,
    revoked_by UUID
);

CREATE INDEX IF NOT EXISTS idx_permission_overrides_user_id ON permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_overrides_expires_at ON permission_overrides(expires_at);
CREATE INDEX IF NOT EXISTS idx_permission_overrides_is_active ON permission_overrides(is_active);

-- ============================================================
-- 5. ACCESS DECISION AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS access_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    action VARCHAR(50) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    granted BOOLEAN NOT NULL,
    reason VARCHAR(500),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_decisions_user_id ON access_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_access_decisions_action ON access_decisions(action);
CREATE INDEX IF NOT EXISTS idx_access_decisions_granted ON access_decisions(granted);
CREATE INDEX IF NOT EXISTS idx_access_decisions_created_at ON access_decisions(created_at);

-- ============================================================
-- 6. ROLE HIERARCHY LEVELS (for quick lookup)
-- ============================================================

CREATE TABLE IF NOT EXISTS role_hierarchy (
    role VARCHAR(20) PRIMARY KEY,
    level INTEGER NOT NULL,
    parent_role VARCHAR(20),
    description VARCHAR(200)
);

INSERT INTO role_hierarchy (role, level, parent_role, description) VALUES
    ('CEO', 1, NULL, 'Chief Executive Officer - Full system access'),
    ('CXO', 2, 'CEO', 'Chief Officer (CFO, CCO, CTO) - Division-level access'),
    ('DIRECTOR', 3, 'CXO', 'Director - Department-level access'),
    ('MANAGER', 4, 'DIRECTOR', 'Manager - Section-level access'),
    ('EXPERT', 5, 'MANAGER', 'Expert - Functional area access'),
    ('SPECIALIST', 6, 'EXPERT', 'Specialist - Narrow module scope'),
    ('ANALYST', 7, 'SPECIALIST', 'Analyst - Read-only/reporting access'),
    ('admin', 1, NULL, 'System Administrator - Full system access'),
    ('user', 7, NULL, 'Regular User - Standard user access')
ON CONFLICT (role) DO UPDATE SET
    level = EXCLUDED.level,
    parent_role = EXCLUDED.parent_role,
    description = EXCLUDED.description;

-- ============================================================
-- 7. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_division_id ON users(division_id);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_section_id ON users(section_id);
CREATE INDEX IF NOT EXISTS idx_divisions_head_user_id ON divisions(head_user_id);
CREATE INDEX IF NOT EXISTS idx_departments_head_user_id ON departments(head_user_id);
CREATE INDEX IF NOT EXISTS idx_sections_head_user_id ON sections(head_user_id);
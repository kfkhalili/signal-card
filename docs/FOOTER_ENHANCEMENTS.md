# Footer Enhancements - Future Additions

This document tracks footer sections that have been commented out and should be re-enabled when the corresponding content is ready and provides real value to users.

## Current Footer State

The footer has been simplified to include only essential elements:
- Company branding and description
- Social media links (Twitter, GitHub, LinkedIn)
- Legal links (Privacy Policy, Terms of Service, Cookie Policy)
- Contact Support link
- Copyright notice
- Technology badges (Supabase, Next.js)

## Sections to Re-enable

### 1. Product Section
**Location:** `src/components/layout/Footer.tsx` (commented out)

**Links to add back:**
- About Tickered (`/about`)
- Features (`/features`)
- Pricing (`/pricing`)
- Workspace (`/workspace`)

**When to re-enable:**
- When `/features` page has substantial, valuable content (not just placeholders)
- When `/pricing` page has finalized pricing structure and clear value proposition
- When `/about` page provides meaningful company information
- When `/workspace` is a public-facing feature worth highlighting

**Priority:** Medium - These are useful navigation links but not critical for credibility.

---

### 2. Resources Section
**Location:** `src/components/layout/Footer.tsx` (commented out)

**Links to add back:**
- Blog (`/blog`)
- Help Center (`/help`)
- API Documentation (`/api`)
- System Status (`/status`)

**When to re-enable:**
- **Blog**: When there are at least 5-10 published articles with real content
- **Help Center**: When comprehensive help documentation is available
- **API Documentation**: When API is publicly available and documentation is complete
- **System Status**: When live status monitoring is implemented (not just a placeholder)

**Priority:** High for API Documentation (if API is a key product feature), Medium for others.

---

### 3. Company Section
**Location:** `src/components/layout/Footer.tsx` (commented out)

**Links to add back:**
- About Us (`/about`)
- Careers (`/careers`)
- Contact (`/contact`)
- Press Kit (`/press`)

**When to re-enable:**
- **About Us**: When page has substantial company information, mission, team details
- **Careers**: When actively hiring and job listings are available
- **Contact**: Already functional, but consider if it needs to be in footer vs. header
- **Press Kit**: When press materials, logos, and media resources are available

**Priority:** Low - These are nice-to-have but not essential for core functionality.

---

### 4. Features Highlight Section
**Location:** `src/components/layout/Footer.tsx` (commented out)

**Content:**
- Real-time Data highlight
- Dual Audience highlight
- Secure & Reliable highlight

**When to re-enable:**
- When footer space allows for additional marketing messaging
- When these highlights provide clear differentiation
- Consider A/B testing to see if they improve conversions

**Priority:** Low - Marketing-focused, not essential for functionality.

---

## Implementation Notes

1. **Grid Layout**: When re-enabling sections, adjust the grid layout:
   - Current: `grid-cols-1 md:grid-cols-2` (2 columns)
   - With Product + Resources: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` (4 columns)
   - With all sections: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` (4 columns)

2. **Spacing**: Maintain consistent spacing with `gap-8` and `mb-8` classes.

3. **Accessibility**: Ensure all links have proper hover states and are keyboard navigable.

4. **Mobile Responsiveness**: Test footer on mobile devices when re-enabling sections.

---

## Decision Criteria

Before re-enabling any section, ask:
1. Does this link lead to content that provides real value?
2. Is the content complete and professional (not placeholder text)?
3. Will this improve user experience or just add clutter?
4. Is the page linked to actually functional and useful?

**Rule of thumb**: Only re-enable when the linked page is production-ready and adds value.

---

## Related Files

- `src/components/layout/Footer.tsx` - Main footer component
- `src/app/about/page.tsx` - About page
- `src/app/features/page.tsx` - Features page
- `src/app/pricing/page.tsx` - Pricing page
- `src/app/help/page.tsx` - Help center
- `src/app/api/page.tsx` - API documentation
- `src/app/status/page.tsx` - System status
- `src/app/careers/page.tsx` - Careers page
- `src/app/press/page.tsx` - Press kit

---

## Last Updated

November 2025 - Footer simplified to essential elements only.


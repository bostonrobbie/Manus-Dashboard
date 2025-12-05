# Dashboard Design Research - 2025/2026 Trends

## Key Findings from Modern Dashboard Design

### Visual Design Trends

**1. Dark Mode with High Contrast**
- Deep backgrounds (near-black) with bright, clear text
- Soft gradients for visual interest without overwhelming
- Bold typography for hierarchy
- Glowing accents for important metrics

**2. Metrics Card Design Patterns**
- Clean spacing with generous padding
- Soft shadows or subtle borders (not heavy borders)
- Color-coded indicators (green for positive, red for negative)
- Icon + metric + label structure
- Micro-animations on hover
- Grouped related metrics together

**3. Visual Hierarchy Best Practices**
- Most important metrics at the top in larger cards
- Use of size, color, and position to guide attention
- White space is crucial - don't overcrowd
- Group related information into sections
- Clear section headers with subtle dividers

**4. Modern Layout Patterns**
- Grid-based layouts with consistent spacing
- Responsive card grids (not rigid tables)
- Sticky headers for navigation
- Collapsible sections for dense information
- Progressive disclosure - show summary, expand for details

**5. Color Usage**
- Purposeful color coding (green = gains, red = losses)
- Accent colors for highlights and CTAs
- Muted backgrounds to make data stand out
- Consistent color palette throughout
- Use of gradients for visual depth

**6. Typography**
- Bold, large numbers for key metrics
- Clear hierarchy: metric value > label > description
- Sans-serif fonts for readability
- Consistent font sizing system
- Adequate line height and letter spacing

### Financial Dashboard Specific Patterns

**Metrics Display:**
- Large primary metric with smaller context (e.g., "+84.63%" with "Annualized: 106.82%")
- Trend indicators (arrows, sparklines)
- Date ranges for context
- Comparison values (vs benchmark, vs previous period)

**Card Structure:**
- Icon or visual indicator at top
- Primary metric (large, bold)
- Secondary context (smaller, muted)
- Optional: mini chart or sparkline
- Optional: change indicator

**Layout Recommendations:**
- Hero metrics in a grid at the top (3-6 cards)
- Summary text below metrics (narrative overview)
- Charts and detailed analysis below
- Filters and controls in a sticky header or sidebar

### Specific Improvements for Our Dashboard

**Overview Page Top Section:**
1. Redesign metrics cards with:
   - Larger, bolder numbers
   - Icons for each metric type
   - Better spacing and padding
   - Subtle shadows instead of borders
   - Hover effects for interactivity

2. Improve visual grouping:
   - Group performance metrics together (Return, Sharpe, Sortino, Calmar)
   - Group risk metrics together (Max Drawdown, Win Rate)
   - Use subtle background differences or spacing

3. Enhance the summary section:
   - Make it more prominent with better styling
   - Add an icon or visual indicator
   - Better typography and spacing
   - Consider a light background to separate from metrics

**Strategy Cards:**
1. Add performance indicators:
   - Sparkline equity curve preview
   - Key stats (Return %, Sharpe, Win Rate)
   - Color-coded performance indicator
   - Market-specific icons

2. Improve card design:
   - Larger, more prominent
   - Better hover states
   - More visual hierarchy
   - Show more useful information at a glance

**Compare Page:**
1. Reduce visual noise:
   - Lower grid opacity (0.1-0.15 instead of current)
   - Cleaner chart backgrounds
   - Better color contrast for lines

2. Improve layout:
   - Better spacing between sections
   - Clearer section headers
   - More prominent controls

## Implementation Plan

### Phase 1: Overview Page Metrics Section
- Redesign metric cards with modern styling
- Add icons to each metric
- Improve spacing and layout
- Enhance summary section
- Remove redundant sections (Monthly Returns Calendar, Major Drawdowns)

### Phase 2: Strategies Page
- Redesign strategy cards with performance stats
- Add sparkline previews
- Add market icons
- Improve visual hierarchy

### Phase 3: Compare Page
- Reduce grid opacity on charts
- Improve overall layout and spacing
- Enhance visual hierarchy

## Design Tokens to Use

**Spacing:**
- Card padding: 1.5rem (24px)
- Card gap: 1.5rem (24px)
- Section spacing: 3rem (48px)

**Shadows:**
- Card shadow: 0 1px 3px rgba(0,0,0,0.3)
- Hover shadow: 0 4px 12px rgba(0,0,0,0.4)

**Typography:**
- Metric value: 2.5rem (40px), font-weight: 700
- Metric label: 0.875rem (14px), font-weight: 500
- Section header: 1.5rem (24px), font-weight: 600

**Colors:**
- Positive: #22c55e (green-500)
- Negative: #ef4444 (red-500)
- Neutral: #a3a3a3 (neutral-400)
- Accent: #60a5fa (blue-400)

**Grid Opacity:**
- Chart grids: 0.1 (10% opacity)
- Subtle dividers: 0.15 (15% opacity)

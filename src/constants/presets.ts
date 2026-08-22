export const DEFAULT_PRESETS = [
  {
    id: 'user-discrepancy',
    name: 'Discrepancy Summary (Your Sample)',
    description: 'Nested discrepancies with Expected value, Recommended correction, and Citation',
    content: `### 3.2 Summary Section

**List of Discrepancies:**
*   **Column Header:** Notes
    *   **Expected value (from source):** Reima Rytsölä should be classified as independent from major shareholders, and he should not be identified as having stepped down from the role of "chair of the board".
    *   **Recommended correction:** Update the Notes field for Reima Rytsölä to state: "(i) Independence: a) Independent from the company and its management, b) independent from major shareholders. (ii) Reima Rytsölä stepped down as a member of the board on 24th of March 2026 after the financial year-end."
    *   **Supporting citation:** Stora Enso Annual Report 2025, page 4 (which explicitly lists only Håkan Buskhe and Richard Nilsson as exceptions to significant shareholder independence) and page 13 (which lists Reima Rytsölä's title as "Member of Stora Enso’s Board of Directors", not Chair).`,
  },
  {
    id: 'audit-table-and-list',
    name: 'Audit Findings with Table',
    description: 'Header, audit findings table, and nested action items',
    content: `### 4.0 Compliance Audit Findings

**Summary of Scope:** Review of Q1 2026 corporate governance and board independence.

| Finding Ref | Entity / Individual | Status | Priority | Action Due |
| :--- | :--- | :--- | :--- | :--- |
| **AUD-01** | Reima Rytsölä | Discrepancy Found | High | Immediate |
| **AUD-02** | Håkan Buskhe | Verified Exception | Low | Q2 2026 |
| **AUD-03** | Richard Nilsson | Verified Exception | Low | Q2 2026 |

**Detailed Action Items:**
*   **Board Classification Rectifications**
    *   **Action 1.1:** Correct biographical notes in the investor relations portal.
    *   **Action 1.2:** Re-publish amended schedule of committee memberships.
*   **Documentation Cross-Reference**
    *   **Source File:** Stora Enso Annual Report 2025 (Pages 4 & 13)
    *   **Auditor Sign-off:** Governance & Ethics Committee`,
  },
  {
    id: 'executive-brief',
    name: 'Executive Decision Memo',
    description: 'Key conclusions, recommendations, and evidence points',
    content: `### 1.1 Executive Summary & Key Decisions

**Critical Highlights:**
*   **Governance Status:** Independent majority threshold maintained at 83%.
    *   **Verification:** All non-executive directors verified against EU Corporate Governance Code.
    *   **Remediation:** Single disclosure typo corrected on page 4 footnotes.
*   **Next Steps for Legal & IR:**
    *   Distribute updated briefing to statutory auditors before March 31, 2026.
    *   Archive audit trail in the company secretary repository.`,
  },
];

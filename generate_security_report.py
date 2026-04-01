# generate_security_report.py
# Generates stats tables and charts for the MS3 security testing report.
# Run after all security tests have been executed and findings documented.
# Usage: python3 generate_security_report.py

import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

OUTPUT_DIR = 'docs/security/security_report_charts'
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── DATA ─────────────────────────────────────────────────────────────────────
# Findings confirmed by test run (FAIL = finding confirmed, PASS* = risk present but not exploitable)

FINDINGS = [
    # (story_id, title, severity, owasp, first_run_result, remediation)
    ('AUTH-03e', 'Email enumeration via distinct login error messages', 'Medium', 'A07',
     'FAIL', 'Unify error message for invalid email vs wrong password'),
    ('AUTH-04',  'No rate limiting on login endpoint',                  'Medium', 'A07',
     'FAIL', 'Add express-rate-limit (windowMs:15min, max:10)'),
    ('CONFIG-01','CORS wildcard — cors() with no options',              'Medium', 'A05',
     'FAIL', 'Restrict origin to CLIENT_URL env var'),
    ('CONFIG-02','Missing security headers (no helmet)',                'Low',    'A05',
     'FAIL', 'npm install helmet; app.use(helmet())'),
    ('DATA-02',  'Raw error object in 500 responses (CWE-209 risk)',    'Low',    'A05',
     'PASS*', 'Replace error with error.message in all catch blocks'),
]

# Actual test counts per epic from: npm run test:security -- --verbose
EPIC_TEST_COUNTS = {
    'AUTH\n(Auth Security)':       28,   # auth.jwt(8) + auth.hardening(19) + auth.ratelimit(1)
    'AUTHZ\n(Access Control)':     27,   # authz.admin(18) + authz.idor(2) + authz.massassign(2) + authz.bizlogic(5)
    'INJ\n(Injection)':             6,   # inj.query(6)
    'DATA\n(Data Protection)':     10,   # data.exposure(6) + data.errors(4)
    'CONFIG\n(Configuration)':      6,   # config.cors(3) + config.headers(3)
}

SEVERITY_COUNTS = {'High': 0, 'Medium': 3, 'Low': 2}

OWASP_COVERAGE = {
    'A01 Broken Access Control':             3,   # AUTHZ-01, AUTHZ-02, AUTHZ-03/04
    'A02 Cryptographic Failures':            1,   # DATA-01
    'A03 Injection':                         2,   # AUTH-03 injection, INJ-01
    'A05 Security Misconfiguration':         4,   # DATA-02, CONFIG-01, CONFIG-02, CONFIG-04
    'A06 Vulnerable Components':             1,   # CONFIG-03 Semgrep
    'A07 Auth Failures':                     4,   # AUTH-01, AUTH-02, AUTH-03, AUTH-04
}

# ── TABLE ─────────────────────────────────────────────────────────────────────
def print_findings_table():
    SEV_ORDER = {'High': 0, 'Medium': 1, 'Low': 2}
    sorted_findings = sorted(FINDINGS, key=lambda f: SEV_ORDER[f[2]])

    header = f"{'Story':<12} {'Severity':<8} {'OWASP':<6} {'Result':<8} {'Title'}"
    print('\n## Security Findings Summary\n')
    print(header)
    print('-' * 90)
    for story, title, sev, owasp, result, _ in sorted_findings:
        print(f"{story:<12} {sev:<8} {owasp:<6} {result:<8} {title}")
    print(f'\nTotal findings: {len(FINDINGS)}')
    print(f"High: {SEVERITY_COUNTS['High']}  Medium: {SEVERITY_COUNTS['Medium']}  Low: {SEVERITY_COUNTS['Low']}")
    total_tests = sum(EPIC_TEST_COUNTS.values())
    fail_tests = 11
    print(f"\nTotal tests: {total_tests}  Passed: {total_tests - fail_tests}  Failed (findings): {fail_tests}")

# ── CHART 1: Tests by Epic ────────────────────────────────────────────────────
def chart_tests_by_epic():
    epics = list(EPIC_TEST_COUNTS.keys())
    counts = list(EPIC_TEST_COUNTS.values())
    colors = ['#1A355E', '#2E86C1', '#148F77', '#27AE60', '#D35400']

    fig, ax = plt.subplots(figsize=(9, 5))
    bars = ax.bar(epics, counts, color=colors, edgecolor='white', linewidth=0.8)

    for bar, count in zip(bars, counts):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.3,
                str(count), ha='center', va='bottom', fontsize=11, fontweight='bold')

    ax.set_title('MS3 Security Tests by Epic', fontsize=14, fontweight='bold', pad=12)
    ax.set_ylabel('Number of Tests', fontsize=11)
    ax.set_ylim(0, max(counts) + 5)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.tick_params(axis='x', labelsize=9)

    total = sum(counts)
    ax.text(0.98, 0.97, f'Total: {total} tests', transform=ax.transAxes,
            ha='right', va='top', fontsize=10, color='#555')

    path = f'{OUTPUT_DIR}/chart1_tests_by_epic.png'
    fig.tight_layout()
    fig.savefig(path, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f'Saved: {path}')

# ── CHART 2: Findings by Severity ─────────────────────────────────────────────
def chart_findings_by_severity():
    labels = [k for k, v in SEVERITY_COUNTS.items() if v > 0]
    sizes  = [v for k, v in SEVERITY_COUNTS.items() if v > 0]
    colors_map = {'High': '#C0392B', 'Medium': '#E67E22', 'Low': '#F1C40F'}
    bar_colors = [colors_map[l] for l in labels]

    fig, ax = plt.subplots(figsize=(6, 4))
    bars = ax.bar(labels, sizes, color=bar_colors, edgecolor='white', linewidth=0.8, width=0.5)

    for bar, count in zip(bars, sizes):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.05,
                str(count), ha='center', va='bottom', fontsize=13, fontweight='bold')

    ax.set_title('Security Findings by Severity', fontsize=14, fontweight='bold', pad=12)
    ax.set_ylabel('Number of Findings', fontsize=11)
    ax.set_ylim(0, max(sizes) + 1)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

    path = f'{OUTPUT_DIR}/chart2_findings_severity.png'
    fig.tight_layout()
    fig.savefig(path, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f'Saved: {path}')

# ── CHART 3: OWASP Coverage ───────────────────────────────────────────────────
def chart_owasp_coverage():
    categories = list(OWASP_COVERAGE.keys())
    counts = list(OWASP_COVERAGE.values())

    fig, ax = plt.subplots(figsize=(9, 5))
    y_pos = np.arange(len(categories))
    bars = ax.barh(y_pos, counts, color='#2E86C1', edgecolor='white', linewidth=0.8)

    for bar, count in zip(bars, counts):
        ax.text(bar.get_width() + 0.05, bar.get_y() + bar.get_height() / 2,
                str(count), va='center', fontsize=11, fontweight='bold')

    ax.set_yticks(y_pos)
    ax.set_yticklabels(categories, fontsize=10)
    ax.set_xlabel('Stories Covering This Category', fontsize=11)
    ax.set_title('OWASP Top 10 Coverage', fontsize=14, fontweight='bold', pad=12)
    ax.set_xlim(0, max(counts) + 1.5)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

    path = f'{OUTPUT_DIR}/chart3_owasp_coverage.png'
    fig.tight_layout()
    fig.savefig(path, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f'Saved: {path}')

# ── MAIN ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print_findings_table()
    chart_tests_by_epic()
    chart_findings_by_severity()
    chart_owasp_coverage()
    print(f'\nAll charts saved to {OUTPUT_DIR}/')

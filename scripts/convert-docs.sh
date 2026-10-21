#!/bin/bash
# Documentation Conversion Script
# Converts Markdown documentation to PDF and Word formats

set -euo pipefail

# Configuration
DOCS_DIR="/Users/tamrat/Documents/Code/takelow/docs"
OUTPUT_DIR="/Users/tamrat/Documents/Code/takelow/docs/output"
TEMPLATE_DIR="/Users/tamrat/Documents/Code/takelow/scripts/templates"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Create output directory
mkdir -p "${OUTPUT_DIR}/pdf" "${OUTPUT_DIR}/docx" "${OUTPUT_DIR}/html"

# Check for pandoc
if ! command -v pandoc &> /dev/null; then
    log_error "pandoc not found. Please install: brew install pandoc"
    exit 1
fi

# Create LaTeX template for PDF
create_latex_template() {
    cat > "${TEMPLATE_DIR}/eisvogel.latex" << 'EOF'
% Custom LaTeX template for Guess X documentation
\usepackage{booktabs}
\usepackage{longtable}
\usepackage{array}
\usepackage{multirow}
\usepackage{wrapfig}
\usepackage{float}
\usepackage{colortbl}
\usepackage{pdflscape}
\usepackage{tabu}
\usepackage{threeparttable}
\usepackage{threeparttablex}
\usepackage[normalem]{ulem}
\usepackage{makecell}
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{fontawesome5}
\usepackage{tcolorbox}
\usepackage{enumitem}
\usepackage{setspace}

\definecolor{Guess XBlue}{HTML}{1E3A8A}
\definecolor{Guess XGreen}{HTML}{059669}
\definecolor{Guess XOrange}{HTML}{EA580C}
\definecolor{LightGray}{HTML}{F3F4F6}

\hypersetup{
    colorlinks=true,
    linkcolor=Guess XBlue,
    filecolor=Guess XBlue,
    urlcolor=Guess XBlue,
    citecolor=Guess XGreen,
}

% Header and footer
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small Guess X Documentation}
\fancyhead[R]{\small \leftmark}
\fancyfoot[C]{\thepage}
\renewcommand{\headrulewidth}{0.4pt}
\renewcommand{\footrulewidth}{0.4pt}

% Table styling
\setlength{\tabcolsep}{6pt}
\renewcommand{\arraystretch}{1.2}

% Code block styling
\definecolor{codebg}{HTML}{1E1E1E}
\definecolor{codefg}{HTML}{D4D4D4}

% Custom commands
\newcommand{\guessxlogo}{\includegraphics[height=1.2cm]{guessx-logo.png}}
\newcommand{\version}[1]{\textbf{Version:} #1}
\newcommand{\datepub}[1]{\textbf{Date:} #1}
EOF
    log_info "Created LaTeX template"
}

# Convert a single markdown file
convert_file() {
    local input_file="$1"
    local base_name=$(basename "$input_file" .md)
    local output_pdf="${OUTPUT_DIR}/pdf/${base_name}.pdf"
    local output_docx="${OUTPUT_DIR}/docx/${base_name}.docx"
    local output_html="${OUTPUT_DIR}/html/${base_name}.html"

    log_info "Converting: $base_name"

    # HTML (standalone with embedded CSS)
    if pandoc "$input_file" \
        --from markdown+yaml_metadata_block \
        --to html5 \
        --standalone \
        --toc \
        --toc-depth=3 \
        --number-sections \
        --syntax-highlighting=tango \
        --css="${TEMPLATE_DIR}/github-pandoc.css" \
        --metadata=title:"Guess X - ${base_name}" \
        --output="$output_html" 2>/dev/null; then
        log_info "  ✓ HTML: $output_html"
    else
        log_warn "  HTML conversion failed"
    fi

    # PDF
    local pdf_done=false
    if command -v xelatex &> /dev/null; then
        if pandoc "$input_file" \
            --from markdown+yaml_metadata_block \
            --to pdf \
            --toc \
            --toc-depth=3 \
            --number-sections \
            --syntax-highlighting=tango \
            --pdf-engine=xelatex \
            --variable=fontsize:11pt \
            --variable=geometry:margin=1in \
            --metadata=title:"Guess X - ${base_name}" \
            --metadata=author:"Guess X Team" \
            --metadata=date:"$(date '+%B %d, %Y')" \
            --output="$output_pdf" 2>&1; then
            log_info "  ✓ PDF (xelatex): $output_pdf"
            pdf_done=true
        fi
    fi

    if [ "$pdf_done" = false ] && command -v weasyprint &> /dev/null; then
        if pandoc "$input_file" \
            --from markdown+yaml_metadata_block \
            --to pdf \
            --toc \
            --toc-depth=3 \
            --number-sections \
            --pdf-engine=weasyprint \
            --output="$output_pdf" 2>/dev/null; then
            log_info "  ✓ PDF (weasyprint): $output_pdf"
            pdf_done=true
        fi
    fi

    if [ "$pdf_done" = false ]; then
        local chrome_bin=""
        if [ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
            chrome_bin="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        elif command -v google-chrome &> /dev/null; then
            chrome_bin="google-chrome"
        elif command -v chromium &> /dev/null; then
            chrome_bin="chromium"
        fi

        if [ -n "$chrome_bin" ] && [ -f "$output_html" ]; then
            "$chrome_bin" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="$output_pdf" "$output_html" 2>/dev/null
            if [ -f "$output_pdf" ]; then
                log_info "  ✓ PDF (Chrome): $output_pdf"
                pdf_done=true
            fi
        fi
    fi

    if [ "$pdf_done" = false ]; then
        log_error "  PDF failed: $base_name (no suitable engine found: xelatex, weasyprint, or Chrome)"
    fi

    # Word Document (DOCX)
    if pandoc "$input_file" \
        --from markdown+yaml_metadata_block \
        --to docx \
        --toc \
        --toc-depth=3 \
        --number-sections \
        --syntax-highlighting=tango \
        --metadata=title:"Guess X - ${base_name}" \
        --metadata=author:"Guess X Team" \
        --metadata=date:"$(date '+%B %d, %Y')" \
        --output="$output_docx" 2>/dev/null; then
        log_info "  ✓ DOCX: $output_docx"
    else
        log_error "  DOCX failed: $base_name"
    fi
}

# Create reference.docx for consistent Word styling
create_reference_docx() {
    if [ ! -f "${TEMPLATE_DIR}/reference.docx" ]; then
        log_info "Creating reference.docx template..."
        pandoc --print-default-data-file reference.docx > "${TEMPLATE_DIR}/reference.docx" 2>/dev/null || log_warn "Could not create reference.docx"
    fi
}

# Create GitHub-style CSS for HTML
create_css() {
    cat > "${TEMPLATE_DIR}/github-pandoc.css" << 'EOF'
/* GitHub-style CSS for pandoc HTML output */
* { box-sizing: border-box; }
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 1.5;
    color: #24292e;
    max-width: 980px;
    margin: 0 auto;
    padding: 45px 30px;
    background-color: #ffffff;
}
h1, h2, h3, h4, h5, h6 {
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.25;
    color: #1a1a2e;
}
h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
h3 { font-size: 1.25em; }
h4 { font-size: 1em; }
h5 { font-size: 0.875em; }
h6 { font-size: 0.85em; color: #6a737d; }
p { margin-top: 0; margin-bottom: 16px; }
a { color: #0366d6; text-decoration: none; }
a:hover { text-decoration: underline; }
code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 85%;
    padding: 0.2em 0.4em;
    background-color: rgba(27, 31, 35, 0.05);
    border-radius: 3px;
}
pre {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 85%;
    line-height: 1.45;
    padding: 16px;
    overflow: auto;
    background-color: #f6f8fa;
    border-radius: 3px;
}
pre code {
    background-color: transparent;
    padding: 0;
    font-size: inherit;
}
table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 16px;
    display: block;
    overflow: auto;
}
th, td {
    border: 1px solid #dfe2e5;
    padding: 6px 13px;
}
th {
    background-color: #f6f8fa;
    font-weight: 600;
}
tr:nth-child(2n) { background-color: #f6f8fa; }
blockquote {
    margin: 0;
    padding: 0 1em;
    color: #6a737d;
    border-left: 0.25em solid #dfe2e5;
}
img { max-width: 100%; }
hr {
    height: 0.25em;
    padding: 0;
    margin: 24px 0;
    background-color: #e1e4e8;
    border: 0;
}
.toc { padding: 20px; background: #f6f8fa; border-radius: 6px; margin-bottom: 30px; }
.toc ul { list-style: none; padding-left: 20px; }
.toc a { color: #0366d6; }
.toc a:hover { text-decoration: underline; }
.header { border-bottom: 1px solid #eaecef; padding-bottom: 20px; margin-bottom: 30px; }
.footer { border-top: 1px solid #eaecef; padding-top: 20px; margin-top: 40px; color: #6a737d; font-size: 0.875em; }
EOF
    log_info "Created GitHub-style CSS"
}

# Main execution
main() {
    log_info "Starting documentation conversion..."
    log_info "Source: $DOCS_DIR"
    log_info "Output: $OUTPUT_DIR"

    mkdir -p "$TEMPLATE_DIR"
    create_latex_template
    create_reference_docx
    create_css

    # Convert all .md files in docs directory
    for md_file in "$DOCS_DIR"/*.md; do
        if [ -f "$md_file" ]; then
            convert_file "$md_file"
        fi
    done

    # Also convert README.md from root
    if [ -f "/Users/tamrat/Documents/Code/takelow/README.md" ]; then
        convert_file "/Users/tamrat/Documents/Code/takelow/README.md"
    fi

    log_info "Conversion complete!"
    log_info "Output directories:"
    log_info "  PDF:  $OUTPUT_DIR/pdf"
    log_info "  DOCX: $OUTPUT_DIR/docx"
    log_info "  HTML: $OUTPUT_DIR/html"

    # List generated files
    echo ""
    log_info "Generated files:"
    ls -la "$OUTPUT_DIR/pdf/" 2>/dev/null | grep -E "\.(pdf|docx|html)$" | awk '{print "  " $9}'
    ls -la "$OUTPUT_DIR/docx/" 2>/dev/null | grep -E "\.(pdf|docx|html)$" | awk '{print "  " $9}'
    ls -la "$OUTPUT_DIR/html/" 2>/dev/null | grep -E "\.(pdf|docx|html)$" | awk '{print "  " $9}'
}

main "$@"
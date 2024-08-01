import sys
import fitz  # PyMuPDF
import json
import re

def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text_content = ""
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text_content += page.get_text()
    
    return text_content

def clean_text(text):
    # Remove multiple newlines, excessive spaces, and unwanted characters
    text = re.sub(r'\n+', '\n', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\.\.\.\.+', ' ', text)
    text = re.sub(r'-+', ' ', text)
    text = text.strip()
    
    # Remove common unwanted text patterns
    text = re.sub(r'(\d+\s*\.\s*)+', '', text)  # Remove numbered lists
    text = re.sub(r'([A-Za-z]+)(\s*\.\s*)+', r'\1', text)  # Remove scattered dots
    
    return text

def chunk_text(text, chunk_size=1000):
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

if __name__ == "__main__":
    try:
        pdf_path = sys.argv[1]
        text_content = extract_text_from_pdf(pdf_path)
        text_content = clean_text(text_content)
        chunks = chunk_text(text_content, 1000)
        
        # Remove BOM if present
        text_content = text_content.lstrip('\ufeff')
        
        # Create list of dictionaries with chunk information
        chunk_objects = [{"book_id": "4f91a575-0feb-4f87-bf0d-f19a4bb6e3af", "chunk_related_text": chunk} for chunk in chunks]
        
        # Print JSON to stdout
        sys.stdout.buffer.write(json.dumps(chunk_objects, ensure_ascii=False, indent=2).encode('utf-8'))
    except Exception as e:
        # Print error to stderr
        sys.stderr.write(f"Error: {e}")

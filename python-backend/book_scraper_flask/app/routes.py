from flask import Blueprint, jsonify
from .scraper import extract_book_links

book_bp = Blueprint('books', __name__)

@book_bp.route('/', methods=['GET'])
def get_books():
    url = "https://books.goalkicker.com/"
    book_list = extract_book_links(url)
    return jsonify({"book_links": book_list})
import requests
from bs4 import BeautifulSoup

def extract_book_links(url):
    response = requests.get(url)

    soup =  BeautifulSoup(response.text, 'html.parser')
    results = soup.find_all('div', attrs = {'class' : 'bookContainer grow'})

    book_links= []
    for result in results:
        tail = result.find('a')['href']
        print(tail)
        link = 'https://books.goalkicker.com/' + tail
        book_links.append(link)
        
    return book_links

# if __name__ == '__main__':
#     url = r"https://books.goalkicker.com/#google_vignette"
#     book_list = extract_book_links(url)
#     print(book_list)
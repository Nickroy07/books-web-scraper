
fetch("../data/example-output.json")
  .then(response => response.json())
  .then(books => {
    const container = document.getElementById("books");

    container.innerHTML = "";

    books.forEach(book => {
      const card = document.createElement("div");

      card.innerHTML = `
        <h2>${book.title}</h2>
        <p><strong>Price:</strong> ${book.price}</p>
        <p><strong>Rating:</strong> ${book.rating}</p>
        <p><strong>Availability:</strong> ${book.availability}</p>
        <a href="${book.product_page_url}" target="_blank">
          View Book
        </a>
      `;

      container.appendChild(card);
    });
  })
  .catch(error => {
    console.error("Error loading book data:", error);

    document.getElementById("books").innerHTML =
      "<p>Unable to load book data.</p>";
  });

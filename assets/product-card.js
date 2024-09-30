if (!customElements.get('product-card')) {
  customElements.define(
    'product-card',
    class ProductCard extends HTMLElement {
      constructor() {
        super();
        this.product = JSON.parse(this.querySelector('#p-data').innerHTML);
        this.handleQuickAddButton();
      }

      handleQuickAddButton() {
        const QuickAddButton = this.querySelector('.quick-add__btn');
        const loadingSpinner = QuickAddButton.querySelector('.loading__spinner');
        QuickAddButton.addEventListener('click', () => {
          const productUrl = `/products/${this.product.data.handle}`;
          QuickAddButton.classList.add('loading');
          loadingSpinner.classList.remove('hidden');
          fetch(productUrl)
            .then((response) => response.text())
            .then((responseText) => {
              const html = new DOMParser().parseFromString(responseText, 'text/html');
              const template = html.querySelector(`#drawer-product-${this.product.data.id}`);
              if (template) {
                document.body.appendChild(template.content);
                const drawer = document.querySelector('.drawer-product-selector');
                requestAnimationFrame(() => {
                  drawer.classList.add('show-product-selector');
                });
                this.handleDrawerClose(drawer);
              }
            })
            .then(() => {})
            .catch((error) => {
              if (error.name === 'AbortError') {
                console.log('Fetch aborted by user');
              } else {
                console.error(error);
              }
            })
            .finally(() => {
              QuickAddButton.classList.remove('loading');
              loadingSpinner.classList.add('hidden');
            });
        });
      }

      handleDrawerClose(drawer) {
        const overlayDrawer = drawer.querySelector('.drawer-product-selector__overlay');
        const xIcon = drawer.querySelector('.close-icon-drawer');
        [overlayDrawer, xIcon].forEach((close) => {
          close.addEventListener('click', () => {
            // Remove the class that triggers the transition
            drawer.classList.remove('show-product-selector');

            setTimeout(() => {
              drawer.remove();
            }, 800);
          });
        });
      }
    }
  );
}

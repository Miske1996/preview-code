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
                this.drawer = drawer;
                this.onVariantChangeUnsubscriber = subscribe(
                  PUB_SUB_EVENTS.optionValueCardSelectionChange,
                  this.handleOptionValueChange.bind(this)
                );
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

      buildRequestUrlWithParams(url, optionValues) {
        const params = [];

        // params.push(`sections=template--23234586476879__main`);

        if (optionValues.length) {
          params.push(`option_values=${optionValues.join(',')}`);
        }

        return `${url}?${params.join('&')}`;
      }

      resetProductFormState() {
        const productForm = this.drawer.querySelector('product-form');
        productForm?.toggleSubmitButton(true);
        productForm?.handleErrorMessage();
      }

      getSelectedVariant(productInfoNode) {
        const selectedVariant = productInfoNode.querySelector('variant-selects [data-selected-variant]')?.innerHTML;
        return !!selectedVariant ? JSON.parse(selectedVariant) : null;
      }

      handleOptionValueChange({ data: { event, target, selectedOptionValues, privateEventId } }) {
        if (privateEventId === `product-card-${this.product.data.id}`) {
          const productUrl = `/products/${this.product.data.handle}`;
          this.resetProductFormState();
          const requestUrl = this.buildRequestUrlWithParams(productUrl, selectedOptionValues);
          this.abortController = new AbortController();

          fetch(requestUrl, { signal: this.abortController.signal })
            .then((response) => response.text())
            .then((responseText) => {
              this.pendingRequestUrl = null;
              const html = new DOMParser().parseFromString(responseText, 'text/html');
              const template = html.querySelector(`#drawer-product-${this.product.data.id}`);
              const newDrawer = template.content.querySelector('.drawer-product-selector');
              const variant = this.getSelectedVariant(newDrawer);
              this.drawer.querySelector('variant-selects').innerHTML =
                newDrawer.querySelector('variant-selects').innerHTML;
              this.drawer.querySelector('.drawer__header-product-price').innerHTML = newDrawer.querySelector(
                '.drawer__header-product-price'
              ).innerHTML;
              this.drawer.querySelector('.product-variant-id').value = variant.id;
              this.drawer
                .querySelector('product-form')
                .toggleSubmitButton(
                  newDrawer.querySelector(`.product-form__submit`)?.hasAttribute('disabled') ?? true,
                  window.variantStrings.soldOut
                );
            })
            .then(() => {
              // set focus to last clicked option value
              this.querySelector(`#${target.id}`)?.focus();
            })
            .catch((error) => {
              if (error.name === 'AbortError') {
                console.log('Fetch aborted by user');
              } else {
                console.error(error);
              }
            });
        }
      }
    }
  );
}

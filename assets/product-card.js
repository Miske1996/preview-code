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
        QuickAddButton.addEventListener('click', () => this.handleQuickAddClick(QuickAddButton, loadingSpinner));
      }

      async handleQuickAddClick(QuickAddButton, loadingSpinner) {
        const productUrl = `/products/${this.product.data.handle}`;
        this.toggleLoadingState(QuickAddButton, loadingSpinner, true);

        try {
          const responseText = await this.fetchProductData(productUrl);
          const template = this.extractTemplate(responseText);

          if (template) {
            this.appendTemplateContent(template);
            this.initializeDrawer();
          }
        } catch (error) {
          this.handleFetchError(error);
        } finally {
          this.toggleLoadingState(QuickAddButton, loadingSpinner, false);
        }
      }

      async fetchProductData(url) {
        const response = await fetch(url);
        return response.text();
      }

      extractTemplate(responseText) {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        return html.querySelector(`#drawer-product-${this.product.data.id}`);
      }

      appendTemplateContent(template) {
        document.body.appendChild(template.content);
      }

      initializeDrawer() {
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

      handleDrawerClose(drawer) {
        const overlayDrawer = drawer.querySelector('.drawer-product-selector__overlay');
        const xIcon = drawer.querySelector('.close-icon-drawer');
        [overlayDrawer, xIcon].forEach((close) => {
          close.addEventListener('click', () => this.closeDrawer(drawer));
        });
      }

      closeDrawer(drawer) {
        drawer.classList.remove('show-product-selector');
        setTimeout(() => drawer.remove(), 800);
      }

      toggleLoadingState(button, spinner, isLoading) {
        if (isLoading) {
          button.classList.add('loading');
          spinner.classList.remove('hidden');
        } else {
          button.classList.remove('loading');
          spinner.classList.add('hidden');
        }
      }

      buildRequestUrlWithParams(url, optionValues) {
        const params = optionValues.length ? [`option_values=${optionValues.join(',')}`] : [];
        return `${url}?${params.join('&')}`;
      }

      resetProductFormState() {
        const productForm = this.drawer.querySelector('product-form');
        productForm?.toggleSubmitButton(true);
        productForm?.handleErrorMessage();
      }

      getSelectedVariant(productInfoNode) {
        const selectedVariant = productInfoNode.querySelector('variant-selects [data-selected-variant]')?.innerHTML;
        return selectedVariant ? JSON.parse(selectedVariant) : null;
      }

      handleOptionValueChange({ data: { privateEventId, selectedOptionValues, target } }) {
        if (privateEventId === `product-card-${this.product.data.id}`) {
          this.updateVariant(selectedOptionValues, target);
        }
      }

      async updateVariant(selectedOptionValues, target) {
        const productUrl = `/products/${this.product.data.handle}`;
        this.resetProductFormState();
        const requestUrl = this.buildRequestUrlWithParams(productUrl, selectedOptionValues);
        this.abortController = new AbortController();

        try {
          const responseText = await this.fetchVariantData(requestUrl);
          this.updateDrawerContent(responseText);
          this.focusOnTarget(target);
        } catch (error) {
          this.handleFetchError(error);
        }
      }

      async fetchVariantData(url) {
        const response = await fetch(url, { signal: this.abortController.signal });
        return response.text();
      }

      updateDrawerContent(responseText) {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const template = html.querySelector(`#drawer-product-${this.product.data.id}`);
        const newDrawer = template.content.querySelector('.drawer-product-selector');
        const variant = this.getSelectedVariant(newDrawer);

        this.drawer.querySelector('variant-selects').innerHTML = newDrawer.querySelector('variant-selects').innerHTML;
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
      }

      focusOnTarget(target) {
        this.querySelector(`#${target.id}`)?.focus();
      }

      handleFetchError(error) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted by user');
        } else {
          console.error(error);
        }
      }
    }
  );
}

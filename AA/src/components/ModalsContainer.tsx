import React from 'react';
import { CartItem, Address, UserInfo, Order, PaymentMethod, LanguageCode, Invoice, PricingSettings, PaymentSettings } from '../types';
import type { PaymentExecutionRequest, PaymentExecutionResponse } from '../utils/payments';
import {
  ChangePasswordDialog,
  AddressesDialog,
  PreferencesDialog,
  AccountInfoDialog
} from './modals/accountDialogs';
import {
  CartDialog,
  CheckoutDialog,
  PaymentDialog,
  OrderCompleteDialog,
  StoreDialog
} from './modals/commerceDialogs';
import { BillingDialog } from './modals/BillingDialog';

interface ModalsContainerProps {
  // États des modales
  changePasswordOpen: boolean;
  setChangePasswordOpen: (open: boolean) => void;
  addressesOpen: boolean;
  setAddressesOpen: (open: boolean) => void;
  preferencesOpen: boolean;
  setPreferencesOpen: (open: boolean) => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  checkoutOpen: boolean;
  setCheckoutOpen: (open: boolean) => void;
  paymentOpen: boolean;
  setPaymentOpen: (open: boolean) => void;
  orderCompleteOpen: boolean;
  setOrderCompleteOpen: (open: boolean) => void;
  storeOpen: boolean;
  setStoreOpen: (open: boolean) => void;
  accountInfoOpen: boolean;
  setAccountInfoOpen: (open: boolean) => void;
  billingOpen: boolean;
  setBillingOpen: (open: boolean) => void;

  // Données
  personalAddress: Address;
  setPersonalAddress: (address: Address | ((prev: Address) => Address)) => void;
  billingAddress: Address;
  setBillingAddress: (address: Address | ((prev: Address) => Address)) => void;
  siteLanguage: LanguageCode;
  setSiteLanguage: (lang: LanguageCode) => void;
  chatLanguage: LanguageCode;
  setChatLanguage: (lang: LanguageCode) => void;
  cart: CartItem[];
  userInfo: UserInfo;
  setUserInfo: (user: UserInfo | ((prev: UserInfo) => UserInfo)) => void;
  invoices: Invoice[];
  currentOrder: Order | null;
  selectedPaymentMethod: PaymentMethod;
  setSelectedPaymentMethod: (method: PaymentMethod) => void;
  pricingSettings: PricingSettings | null;
  paymentSettings: PaymentSettings | null;
  
  // Actions
  handleChangePassword: () => void;
  handleSaveAddresses: () => void | Promise<void>;
  handleSavePreferences: () => void;
  handleSaveAccountInfo: (info: UserInfo) => void | Promise<void>;
  handleSelectInvoice: (invoice: Invoice) => void;
  handleDownloadInvoice: (invoice: Invoice) => void;
  handleUpdateInvoice: (invoiceId: string, updates: Partial<Pick<Invoice, 'status' | 'paymentMethod' | 'paymentDate' | 'paymentReference'>>) => void;
  updateCartItemQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  processOrder: (request: PaymentExecutionRequest) => Promise<PaymentExecutionResponse>;
  addToCart: (type: 'subscription' | 'tokens', quantity: number) => void;
  vatRate: number;
  onProceedToCheckout: () => void;

  // Traductions
  t: any;
}

export function ModalsContainer({
  changePasswordOpen,
  setChangePasswordOpen,
  addressesOpen,
  setAddressesOpen,
  preferencesOpen,
  setPreferencesOpen,
  cartOpen,
  setCartOpen,
  checkoutOpen,
  setCheckoutOpen,
  paymentOpen,
  setPaymentOpen,
  orderCompleteOpen,
  setOrderCompleteOpen,
  storeOpen,
  setStoreOpen,
  accountInfoOpen,
  setAccountInfoOpen,
  billingOpen,
  setBillingOpen,
  personalAddress,
  setPersonalAddress,
  billingAddress,
  setBillingAddress,
  siteLanguage,
  setSiteLanguage,
  chatLanguage,
  setChatLanguage,
  cart,
  userInfo,
  setUserInfo,
  invoices,
  currentOrder,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  pricingSettings,
  paymentSettings,
  handleChangePassword,
  handleSaveAddresses,
  handleSavePreferences,
  handleSaveAccountInfo,
  handleSelectInvoice,
  handleDownloadInvoice,
  handleUpdateInvoice,
  updateCartItemQuantity,
  removeFromCart,
  processOrder,
  addToCart,
  vatRate,
  onProceedToCheckout,
  t
}: ModalsContainerProps) {
  return (
    <>
      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
        onSubmit={handleChangePassword}
        t={t}
      />

      <AddressesDialog
        open={addressesOpen}
        onOpenChange={setAddressesOpen}
        personalAddress={personalAddress}
        setPersonalAddress={setPersonalAddress}
        billingAddress={billingAddress}
        setBillingAddress={setBillingAddress}
        onSave={handleSaveAddresses}
        t={t}
      />

      <PreferencesDialog
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
        siteLanguage={siteLanguage}
        chatLanguage={chatLanguage}
        onSiteLanguageChange={setSiteLanguage}
        onChatLanguageChange={setChatLanguage}
        onSave={handleSavePreferences}
        t={t}
      />

      <CartDialog
        open={cartOpen}
        onOpenChange={setCartOpen}
        cart={cart}
        onOpenStore={() => {
          setCartOpen(false);
          setStoreOpen(true);
        }}
        onOpenCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
        updateCartItemQuantity={updateCartItemQuantity}
        removeFromCart={removeFromCart}
        vatRate={vatRate}
        t={t}
      />

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        billingAddress={billingAddress}
        onEditAddresses={() => {
          setCheckoutOpen(false);
          setAddressesOpen(true);
        }}
        onBackToCart={() => {
          setCheckoutOpen(false);
          setCartOpen(true);
        }}
        onContinueToPayment={() => {
          setCheckoutOpen(false);
          setPaymentOpen(true);
        }}
        vatRate={vatRate}
        t={t}
      />

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        cart={cart}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodChange={setSelectedPaymentMethod}
        onProcessOrder={processOrder}
        onBackToCheckout={() => {
          setPaymentOpen(false);
          setCheckoutOpen(true);
        }}
        vatRate={vatRate}
        paymentSettings={paymentSettings}
        userInfo={userInfo}
        t={t}
      />

      <OrderCompleteDialog
        open={orderCompleteOpen}
        onOpenChange={setOrderCompleteOpen}
        currentOrder={currentOrder}
        selectedPaymentMethod={selectedPaymentMethod}
        t={t}
      />

      <StoreDialog
        open={storeOpen}
        onOpenChange={setStoreOpen}
        cart={cart}
        onViewCart={() => {
          setStoreOpen(false);
          setCartOpen(true);
        }}
        addToCart={addToCart}
        updateCartItemQuantity={updateCartItemQuantity}
        removeFromCart={removeFromCart}
        pricing={pricingSettings}
        onProceedToCheckout={onProceedToCheckout}
        t={t}
      />

      <BillingDialog
        open={billingOpen}
        onOpenChange={setBillingOpen}
        invoices={invoices}
        onSelectInvoice={handleSelectInvoice}
        onDownloadInvoice={handleDownloadInvoice}
        onUpdateInvoice={handleUpdateInvoice}
        translations={t}
        userInfo={userInfo}
        billingAddress={billingAddress}
      />

      {/* Modale des informations de compte */}
      <AccountInfoDialog
        open={accountInfoOpen}
        onOpenChange={setAccountInfoOpen}
        userInfo={userInfo}
        onSave={handleSaveAccountInfo}
        onOpenChangePassword={() => setChangePasswordOpen(true)}
        onOpenPreferences={() => setPreferencesOpen(true)}
        t={t}
      />
    </>
  );
}

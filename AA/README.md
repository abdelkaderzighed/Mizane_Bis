
  # V2-Misan-26-08-25-08-22-export-vers-Bolt

  This is a code bundle for V2-Misan-26-08-25-08-22-export-vers-Bolt. The original project is available at https://www.figma.com/design/xwYVhfmgpaCzzV2NF1ZvSD/V2-Misan-26-08-25-08-22-export-vers-Bolt.

  ## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## Modular dialogues & hooks

- Common account modals (`ChangePasswordDialog`, `AddressesDialog`, `PreferencesDialog`, `AccountInfoDialog`) now live in `src/components/modals/accountDialogs.tsx`. Compose them from `ModalsContainer` or import individually when you need a subset of the flows.
- Commerce modals (`CartDialog`, `CheckoutDialog`, `PaymentDialog`, `OrderCompleteDialog`, `StoreDialog`) are exposed from `src/components/modals/commerceDialogs.tsx` and only require the translated dictionary `t` plus their specific callbacks.
- Voice capture is handled by `src/hooks/useSpeechRecognition.ts`. Pass the current input value, the `t` translations map, and callback setters (`onChange`, `onRequirePermissionDialog`) to reuse recognition state in any form.

- Les versions historiques complètes sont archivées dans le dossier `legacy/` (non incluse dans le bundle).


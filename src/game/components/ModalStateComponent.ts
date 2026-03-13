import { Component } from "@claudiu-ceia/tick";

export type UiModalId = "loot";

export class ModalStateComponent extends Component {
  public activeModal: UiModalId | null = null;

  public open(modal: UiModalId): void {
    this.activeModal = modal;
  }

  public close(modal?: UiModalId): void {
    if (modal && this.activeModal !== modal) {
      return;
    }
    this.activeModal = null;
  }

  public isOpen(modal?: UiModalId): boolean {
    return modal ? this.activeModal === modal : this.activeModal !== null;
  }
}

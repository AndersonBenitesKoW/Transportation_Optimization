import { Directive, input, effect, ElementRef, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appLoading]',
  standalone: true
})
export class LoadingDirective {
  loading = input<boolean>(false);

  constructor(private el: ElementRef, private renderer: Renderer2) {
    effect(() => {
      if (this.loading()) {
        this.renderer.setAttribute(this.el.nativeElement, 'disabled', 'true');
        this.renderer.addClass(this.el.nativeElement, 'loading');
      } else {
        this.renderer.removeAttribute(this.el.nativeElement, 'disabled');
        this.renderer.removeClass(this.el.nativeElement, 'loading');
      }
    });
  }
}
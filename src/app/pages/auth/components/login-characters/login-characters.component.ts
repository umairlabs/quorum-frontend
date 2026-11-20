import {
  Component,
  Input,
  ElementRef,
  inject,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  signal,
  computed,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login-characters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login-characters.component.html',
  styleUrls: ['./login-characters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginCharactersComponent implements OnInit, OnChanges {
  @Input() public focusField: 'none' | 'email' | 'password' = 'none';
  @Input() public showPassword = false;
  @Input() public cursorX = 0;
  @Input() public cursorY = 0;
  @Input() public textLength = 0;
  @Input() public isError = false;

  private readonly el = inject(ElementRef);

  // --- Jelly Body Movement Signals (Full 2D + Squash/Stretch + Shearing) ---
  // Purple
  public purpleShiftX = signal(0);
  public purpleShiftY = signal(0);
  public purpleTilt = signal(0);
  public purpleSkewX = signal(0);
  public purpleScaleX = signal(1);
  public purpleScaleY = signal(1);

  // Black
  public blackShiftX = signal(0);
  public blackShiftY = signal(0);
  public blackLean = signal(0);
  public blackSkewX = signal(0);
  public blackScaleX = signal(1);
  public blackScaleY = signal(1);

  // Orange
  public orangeShiftX = signal(0);
  public orangeShiftY = signal(0);
  public orangeTilt = signal(0);
  public orangeSkewX = signal(0);
  public orangeScaleX = signal(1);
  public orangeScaleY = signal(1);

  // Yellow
  public yellowShiftX = signal(0);
  public yellowShiftY = signal(0);
  public yellowTilt = signal(0);
  public yellowSkewX = signal(0);
  public yellowScaleX = signal(1);
  public yellowScaleY = signal(1);

  // Pupil offset signals
  public purplePupilX = signal(0);
  public purplePupilY = signal(0);
  public blackPupilX = signal(0);
  public blackPupilY = signal(0);
  public orangePupilX = signal(0);
  public orangePupilY = signal(0);
  public yellowPupilX = signal(0);
  public yellowPupilY = signal(0);

  public isHandsUp = signal(false);
  public isLookingAtEmail = signal(false);
  public hasError = signal(false);
  public isEntering = signal(true);

  public ngOnInit(): void {
    // Jump-in drop entrance animation on load / refresh
    this.triggerEntrance();
  }

  public triggerEntrance(): void {
    this.isEntering.set(false);
    setTimeout(() => {
      this.isEntering.set(true);
      setTimeout(() => {
        this.isEntering.set(false);
      }, 1500);
    }, 20);
  }

  // --- Dynamic Transform Strings ---
  public readonly purpleTransform = computed(() =>
    `translate(${this.purpleShiftX().toFixed(1)}px, ${this.purpleShiftY().toFixed(1)}px) rotate(${this.purpleTilt().toFixed(1)}deg) skewX(${this.purpleSkewX().toFixed(1)}deg) scale(${this.purpleScaleX().toFixed(3)}, ${this.purpleScaleY().toFixed(3)})`
  );

  public readonly blackTransform = computed(() =>
    `translate(${this.blackShiftX().toFixed(1)}px, ${this.blackShiftY().toFixed(1)}px) rotate(${this.blackLean().toFixed(1)}deg) skewX(${this.blackSkewX().toFixed(1)}deg) scale(${this.blackScaleX().toFixed(3)}, ${this.blackScaleY().toFixed(3)})`
  );

  public readonly orangeTransform = computed(() =>
    `translate(${this.orangeShiftX().toFixed(1)}px, ${this.orangeShiftY().toFixed(1)}px) rotate(${this.orangeTilt().toFixed(1)}deg) skewX(${this.orangeSkewX().toFixed(1)}deg) scale(${this.orangeScaleX().toFixed(3)}, ${this.orangeScaleY().toFixed(3)})`
  );

  public readonly yellowTransform = computed(() =>
    `translate(${this.yellowShiftX().toFixed(1)}px, ${this.yellowShiftY().toFixed(1)}px) rotate(${this.yellowTilt().toFixed(1)}deg) skewX(${this.yellowSkewX().toFixed(1)}deg) scale(${this.yellowScaleX().toFixed(3)}, ${this.yellowScaleY().toFixed(3)})`
  );

  // === Mouth morph paths ===
  public readonly orangeMouthD = computed(() => {
    if (this.hasError()) {
      return 'M 143,318 Q 155,309 167,318';
    }
    if (this.isHandsUp()) {
      return 'M 145,315 Q 155,317 165,315';
    }
    if (this.isLookingAtEmail()) {
      return 'M 143,313 Q 155,321 167,313';
    }
    return 'M 142,312 Q 155,327 168,312';
  });

  public readonly yellowMouthD = computed(() => {
    if (this.hasError()) {
      return 'M 363,304 Q 367,299 371,304';
    }
    if (this.isHandsUp()) {
      return 'M 363,302 Q 367,303 371,302';
    }
    if (this.isLookingAtEmail()) {
      return 'M 362,301 Q 367,305 372,301';
    }
    return 'M 362,300 Q 367,308 372,300';
  });

  public readonly purpleMouthD = computed(() => {
    if (this.hasError()) {
      return 'M 179,211 Q 185,205 191,211';
    }
    if (this.isHandsUp()) {
      return 'M 179,210 Q 185,206 191,210';
    }
    if (this.isLookingAtEmail()) {
      return 'M 179,209 Q 185,209 191,209';
    }
    return 'M 179,209 Q 185,213 191,209';
  });

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['isError']) {
      this.hasError.set(this.isError);
      if (this.isError) {
        // Worried cringe: squashed and cringing back
        this.purplePupilX.set(-2);
        this.purplePupilY.set(-5);
        this.purpleShiftX.set(-3);
        this.purpleShiftY.set(4);
        this.purpleTilt.set(-3);
        this.purpleSkewX.set(2);
        this.purpleScaleX.set(1.03);
        this.purpleScaleY.set(0.95);

        this.blackPupilX.set(2);
        this.blackPupilY.set(-5);
        this.blackShiftX.set(-2.5);
        this.blackShiftY.set(3.5);
        this.blackLean.set(-2.5);
        this.blackSkewX.set(2);
        this.blackScaleX.set(1.03);
        this.blackScaleY.set(0.95);

        this.orangePupilX.set(-1);
        this.orangePupilY.set(-3);
        this.orangeShiftX.set(-2);
        this.orangeShiftY.set(3);
        this.orangeTilt.set(-2.5);
        this.orangeSkewX.set(1.5);
        this.orangeScaleX.set(1.05);
        this.orangeScaleY.set(0.93);

        this.yellowPupilX.set(1);
        this.yellowPupilY.set(-3);
        this.yellowShiftX.set(-2);
        this.yellowShiftY.set(3);
        this.yellowTilt.set(-3);
        this.yellowSkewX.set(2);
        this.yellowScaleX.set(1.04);
        this.yellowScaleY.set(0.93);
        return;
      }
    }
    if (changes['focusField'] || changes['showPassword']) {
      this.updateState();
    }
    this.recalculateGaze();
  }

  private updateState(): void {
    if (this.focusField === 'password') {
      if (this.showPassword) {
        this.isHandsUp.set(false);
        this.isLookingAtEmail.set(false);
      } else {
        this.isHandsUp.set(true);
        this.isLookingAtEmail.set(false);
      }
    } else if (this.focusField === 'email') {
      this.isHandsUp.set(false);
      this.isLookingAtEmail.set(true);
    } else {
      this.isHandsUp.set(false);
      this.isLookingAtEmail.set(false);
    }
  }

  private recalculateGaze(): void {
    if (this.hasError()) return;

    if (this.isHandsUp()) {
      // Password mode: shy ducking & squashing down in modesty
      this.purplePupilX.set(2);
      this.purplePupilY.set(-4);
      this.purpleShiftX.set(-1.5);
      this.purpleShiftY.set(7);
      this.purpleTilt.set(1.5);
      this.purpleSkewX.set(-1);
      this.purpleScaleX.set(1.04);
      this.purpleScaleY.set(0.93);

      this.blackPupilX.set(-3);
      this.blackPupilY.set(-2);
      this.blackShiftX.set(-1);
      this.blackShiftY.set(6);
      this.blackLean.set(-1.5);
      this.blackSkewX.set(1);
      this.blackScaleX.set(1.04);
      this.blackScaleY.set(0.94);

      this.orangePupilX.set(0);
      this.orangePupilY.set(2);
      this.orangeShiftX.set(0);
      this.orangeShiftY.set(4);
      this.orangeTilt.set(-1.5);
      this.orangeSkewX.set(0.5);
      this.orangeScaleX.set(1.06);
      this.orangeScaleY.set(0.92);

      this.yellowPupilX.set(0);
      this.yellowPupilY.set(2);
      this.yellowShiftX.set(1);
      this.yellowShiftY.set(5);
      this.yellowTilt.set(1.5);
      this.yellowSkewX.set(-1);
      this.yellowScaleX.set(1.06);
      this.yellowScaleY.set(0.92);
      return;
    }

    if (this.focusField === 'email') {
      // Email focused: elastic forward reach & stretch towards the form
      const reach = Math.min(5, this.textLength * 0.2);
      const stretch = Math.min(0.04, this.textLength * 0.002);

      this.purplePupilX.set(7 + reach);
      this.purplePupilY.set(4);
      this.purpleShiftX.set(6 + reach);
      this.purpleShiftY.set(-3);
      this.purpleTilt.set(4.5);
      this.purpleSkewX.set(-3.5);
      this.purpleScaleX.set(0.97 - stretch * 0.5);
      this.purpleScaleY.set(1.035 + stretch);

      this.blackPupilX.set(7.5 + reach);
      this.blackPupilY.set(4.5);
      this.blackShiftX.set(5 + reach);
      this.blackShiftY.set(-2.5);
      this.blackLean.set(4);
      this.blackSkewX.set(-3);
      this.blackScaleX.set(0.98 - stretch * 0.5);
      this.blackScaleY.set(1.03 + stretch);

      this.orangePupilX.set(6.5 + reach);
      this.orangePupilY.set(3.5);
      this.orangeShiftX.set(4 + reach * 0.7);
      this.orangeShiftY.set(-2);
      this.orangeTilt.set(3.5);
      this.orangeSkewX.set(-3.5);
      this.orangeScaleX.set(0.98);
      this.orangeScaleY.set(1.03 + stretch * 0.8);

      this.yellowPupilX.set(7 + reach);
      this.yellowPupilY.set(3.5);
      this.yellowShiftX.set(3.5 + reach * 0.8);
      this.yellowShiftY.set(-2);
      this.yellowTilt.set(5);
      this.yellowSkewX.set(-4);
      this.yellowScaleX.set(0.96 - stretch * 0.5);
      this.yellowScaleY.set(1.045 + stretch);
      return;
    }

    // --- Cursor tracking: Full 2D Organic Jelly Physics ---
    const rect = this.el.nativeElement.getBoundingClientRect();
    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.6;
    const deltaX = this.cursorX - centerX;
    const deltaY = this.cursorY - centerY;
    const angle = Math.atan2(deltaY, deltaX);
    const dist = Math.hypot(deltaX, deltaY);
    const intensity = Math.min(1, dist / 420);
    const maxTravel = 8.5;
    const px = Math.cos(angle) * intensity * maxTravel;
    const py = Math.sin(angle) * intensity * maxTravel;

    // Vertical stretch & squash factor (py < 0: stretch up, py > 0: squash down)
    const vStretch = -py * 0.006;
    const hSquash = vStretch * 0.6;

    // Purple (tall gummy: high top-sway & elastic stretch)
    this.purpleShiftX.set(px * 0.35);
    this.purpleShiftY.set(py * 0.25);
    this.purpleTilt.set(px * 0.35);
    this.purpleSkewX.set(-px * 0.4);
    this.purpleScaleX.set(1 - hSquash + Math.abs(px) * 0.003);
    this.purpleScaleY.set(1 + vStretch);
    this.purplePupilX.set(px);
    this.purplePupilY.set(py);

    // Black (middle pillar: smooth flex)
    this.blackShiftX.set(px * 0.32);
    this.blackShiftY.set(py * 0.22);
    this.blackLean.set(px * 0.38);
    this.blackSkewX.set(-px * 0.35);
    this.blackScaleX.set(1 - hSquash * 0.9 + Math.abs(px) * 0.003);
    this.blackScaleY.set(1 + vStretch * 0.9);
    this.blackPupilX.set(px * 1.05);
    this.blackPupilY.set(py * 1.05);

    // Orange (squishy dome: heavier vertical squash & lateral spread)
    this.orangeShiftX.set(px * 0.28);
    this.orangeShiftY.set(py * 0.28);
    this.orangeTilt.set(px * 0.3);
    this.orangeSkewX.set(-px * 0.38);
    this.orangeScaleX.set(1 - hSquash * 1.25 + Math.abs(px) * 0.004);
    this.orangeScaleY.set(1 + vStretch * 1.2);
    this.orangePupilX.set(px * 0.9);
    this.orangePupilY.set(py * 0.9);

    // Yellow (nimble springy mini-gum: quick bounce)
    this.yellowShiftX.set(px * 0.3);
    this.yellowShiftY.set(py * 0.2);
    this.yellowTilt.set(px * 0.32);
    this.yellowSkewX.set(-px * 0.42);
    this.yellowScaleX.set(1 - hSquash + Math.abs(px) * 0.003);
    this.yellowScaleY.set(1 + vStretch);
    this.yellowPupilX.set(px * 0.85);
    this.yellowPupilY.set(py * 0.85);
  }
}

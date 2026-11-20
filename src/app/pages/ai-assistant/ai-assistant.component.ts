import { Component, inject, signal, WritableSignal, ElementRef, ViewChild, AfterViewChecked, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIAssistantApiService, AIChatMessage, AIActionProposal, AIActionExecutionResult } from './services/ai-assistant-api.service';
import { ActionCardComponent } from './components/action-card/action-card.component';

export interface ChatMessageUI {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  actionProposal?: AIActionProposal | null;
  actionResult?: AIActionExecutionResult | null;
  isExecutingAction?: boolean;
  isActionDismissed?: boolean;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, ActionCardComponent],
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.scss']
})
export class AIAssistantComponent implements OnInit, AfterViewChecked, OnDestroy {
  private readonly aiApiService = inject(AIAssistantApiService);
  private readonly STORAGE_KEY = 'astra_ai_chat_messages';

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLDivElement>;

  protected readonly messages: WritableSignal<ChatMessageUI[]> = signal<ChatMessageUI[]>([]);

  protected readonly inputText: WritableSignal<string> = signal<string>('');
  protected readonly isLoading: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isListening: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isSpeechSupported: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isVoiceModeActive: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isSpeaking: WritableSignal<boolean> = signal<boolean>(false);

  protected readonly suggestedChips: WritableSignal<string[]> = signal<string[]>([]);

  private shouldScrollToBottom = true;
  private isUserScrolledUp = false;
  private speechRecognition: any = null;
  private speechUtterance: SpeechSynthesisUtterance | null = null;

  ngOnInit(): void {
    this.messages.set(this.loadMessages());
    this.fetchSuggestions();
    this.checkSpeechSupport();
  }

  ngOnDestroy(): void {
    this.stopVoiceMode();
    this.stopSpeechRecognition();
    this.stopSpeaking();
  }

  private checkSpeechSupport(): void {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      this.isSpeechSupported.set(true);
    }
  }

  protected toggleSpeechRecognition(): void {
    if (!this.isSpeechSupported()) {
      return;
    }

    if (this.isListening()) {
      this.stopSpeechRecognition();
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = 'en-US';

      // Text that existed in the input before recording started
      const initialText = this.inputText().trim();
      const prefix = initialText ? initialText + ' ' : '';
      // Accumulates all finalized speech segments during this session
      let committedText = '';

      this.speechRecognition.onstart = () => {
        this.isListening.set(true);
      };

      this.speechRecognition.onresult = (event: any) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            // Finalized segment — commit it permanently
            committedText += result[0].transcript;
          } else {
            // Still being spoken — show as preview only
            interimTranscript += result[0].transcript;
          }
        }

        // Show: prefix (pre-recording text) + everything committed + current interim preview
        this.inputText.set(prefix + committedText + interimTranscript);
      };

      this.speechRecognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition error:', event.error);
          this.isListening.set(false);
        }
      };

      this.speechRecognition.onend = () => {
        this.isListening.set(false);
      };

      this.speechRecognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      this.isListening.set(false);
    }
  }

  protected stopSpeechRecognition(): void {
    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch {
        // ignore
      }
    }
    this.isListening.set(false);
  }

  protected toggleVoiceMode(): void {
    if (this.isVoiceModeActive()) {
      this.stopVoiceMode();
    } else {
      this.startVoiceMode();
    }
  }

  protected startVoiceMode(): void {
    this.stopSpeaking();
    this.stopSpeechRecognition();
    this.isVoiceModeActive.set(true);
    this.startVoiceRecognitionLoop();
  }

  protected stopVoiceMode(): void {
    this.isVoiceModeActive.set(false);
    this.stopSpeechRecognition();
    this.stopSpeaking();
  }

  private startVoiceRecognitionLoop(): void {
    if (!this.isSpeechSupported() || !this.isVoiceModeActive()) {
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = false;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = 'en-US';

      let finalSpokenText = '';

      this.speechRecognition.onstart = () => {
        this.isListening.set(true);
      };

      this.speechRecognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalSpokenText += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        this.inputText.set(finalSpokenText + interim);
      };

      this.speechRecognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Voice mode recognition error:', event.error);
        }
      };

      this.speechRecognition.onend = () => {
        this.isListening.set(false);
        const spoken = finalSpokenText.trim() || this.inputText().trim();
        if (this.isVoiceModeActive() && spoken) {
          this.onSendMessage(spoken);
        } else if (this.isVoiceModeActive() && !this.isLoading() && !this.isSpeaking()) {
          // If stopped without speech, restart listening if still in voice mode
          setTimeout(() => {
            if (this.isVoiceModeActive() && !this.isLoading() && !this.isSpeaking()) {
              this.startVoiceRecognitionLoop();
            }
          }, 300);
        }
      };

      this.speechRecognition.start();
    } catch (err) {
      console.error('Failed to start voice mode recognition:', err);
      this.isListening.set(false);
    }
  }

  private speakAIResponse(rawText: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    this.stopSpeaking();
    const cleanText = this.cleanTextForSpeech(rawText);
    if (!cleanText) {
      if (this.isVoiceModeActive()) {
        this.startVoiceRecognitionLoop();
      }
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      this.speechUtterance = utterance;
      utterance.lang = 'en-US';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Try selecting a natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Guy') || v.name.includes('Jenny')) && v.lang.startsWith('en')) ||
        voices.find(v => v.lang.startsWith('en'));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking.set(true);
      };

      utterance.onend = () => {
        this.isSpeaking.set(false);
        this.speechUtterance = null;
        if (this.isVoiceModeActive()) {
          setTimeout(() => {
            if (this.isVoiceModeActive() && !this.isLoading()) {
              this.startVoiceRecognitionLoop();
            }
          }, 400);
        }
      };

      utterance.onerror = () => {
        this.isSpeaking.set(false);
        this.speechUtterance = null;
        if (this.isVoiceModeActive()) {
          this.startVoiceRecognitionLoop();
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech synthesis error:', err);
      this.isSpeaking.set(false);
      if (this.isVoiceModeActive()) {
        this.startVoiceRecognitionLoop();
      }
    }
  }

  protected stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking.set(false);
    this.speechUtterance = null;
  }

  private cleanTextForSpeech(text: string): string {
    if (!text) return '';
    return text
      .replace(/```[\s\S]*?```/g, '') // remove code blocks
      .replace(/`([^`]+)`/g, '$1')     // remove inline code formatting
      .replace(/\*\*([^*]+)\*\*/g, '$1') // remove bold
      .replace(/\*([^*]+)\*/g, '$1')   // remove italics
      .replace(/#+\s/g, '')            // remove headings
      .replace(/[-*•]\s+/g, '')        // remove bullet markers
      .replace(/https?:\/\/\S+/g, 'link') // replace URLs with 'link'
      .replace(/\n+/g, ' ')           // collapse newlines
      .trim();
  }

  private fetchSuggestions(): void {
    this.aiApiService.getSuggestions().subscribe({
      next: (res) => {
        if (res && res.suggestions && res.suggestions.length > 0) {
          this.suggestedChips.set(res.suggestions);
        }
      },
      error: () => {
        // Fallback default suggestions if API fails
        this.suggestedChips.set([
          'How many assets are available?',
          'Show pending maintenance tickets',
          'Show assigned assets by employee',
          'Add a new laptop to inventory',
          'Show asset breakdown by category'
        ]);
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  protected onScrollContainer(): void {
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement;
    // Check if user is scrolled up (more than 100px from bottom)
    const distanceToBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    this.isUserScrolledUp = distanceToBottom > 100;
  }

  private loadMessages(): ChatMessageUI[] {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
        }
      }
    } catch {
      // fallback
    }
    return [];
  }

  private saveMessages(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.messages()));
    } catch {
      // ignore
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch {
      // ignore
    }
  }

  protected onSendMessage(textOverride?: string): void {
    const textToSend = (textOverride || this.inputText()).trim();
    if (!textToSend || this.isLoading()) {
      return;
    }

    const userMsgId = 'usr-' + Date.now();
    const userMsg: ChatMessageUI = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    this.shouldScrollToBottom = true;
    this.isUserScrolledUp = false;
    this.messages.update((msgs) => [...msgs, userMsg]);
    this.saveMessages();
    this.inputText.set('');
    this.isLoading.set(true);

    const history: AIChatMessage[] = this.messages()
      .slice(-6)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

    this.aiApiService.sendChatMessage(textToSend, history).subscribe({
      next: (res) => {
        const aiMsg: ChatMessageUI = {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: res.message,
          timestamp: new Date(),
          actionProposal: res.action || null
        };
        this.messages.update((msgs) => [...msgs, aiMsg]);
        this.saveMessages();
        this.isLoading.set(false);
        if (!this.isUserScrolledUp) {
          this.shouldScrollToBottom = true;
        }

        if (this.isVoiceModeActive()) {
          this.speakAIResponse(res.message);
        }
      },
      error: (err) => {
        const errorMsg: ChatMessageUI = {
          id: 'err-' + Date.now(),
          sender: 'ai',
          text: 'Sorry, I encountered an issue communicating with the backend API. Please check your connection and try again.',
          timestamp: new Date()
        };
        this.messages.update((msgs) => [...msgs, errorMsg]);
        this.saveMessages();
        this.isLoading.set(false);
        if (!this.isUserScrolledUp) {
          this.shouldScrollToBottom = true;
        }

        if (this.isVoiceModeActive()) {
          this.speakAIResponse(errorMsg.text);
        }
      }
    });
  }

  protected onConfirmAction(msg: ChatMessageUI, editedParams?: Record<string, any>): void {
    if (!msg.actionProposal || msg.isExecutingAction) {
      return;
    }

    // Use edited params from the form (ADD_ASSET) if provided, else original params
    const paramsToSend = editedParams ?? msg.actionProposal.params;

    msg.isExecutingAction = true;
    this.messages.update((msgs) => [...msgs]);

    this.aiApiService.executeAction(msg.actionProposal.type, paramsToSend).subscribe({
      next: (res: AIActionExecutionResult) => {
        msg.isExecutingAction = false;
        msg.actionResult = res;
        msg.actionProposal = null; // hide confirmation box after execution
        this.messages.update((msgs) => [...msgs]);
        this.saveMessages();
      },
      error: (err) => {
        msg.isExecutingAction = false;
        msg.actionResult = {
          success: false,
          message: err.error?.message || 'Execution failed due to backend validation error.'
        };
        this.messages.update((msgs) => [...msgs]);
        this.saveMessages();
      }
    });
  }

  protected onCancelAction(msg: ChatMessageUI): void {
    msg.isActionDismissed = true;
    msg.actionProposal = null;
    this.messages.update((msgs) => [...msgs]);
    this.saveMessages();
  }

  protected onClearChat(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.messages.set([]);
    this.fetchSuggestions();
  }

  protected onChipClick(chip: string): void {
    this.onSendMessage(chip);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSendMessage();
    }
  }

  protected formatMarkdown(text: string): string {
    if (!text) return '';
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italics
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-surface-container-highest px-1.5 py-0.5 rounded text-primary font-mono text-body-sm">$1</code>');
    // Bullet list items
    formatted = formatted.replace(/^[-•]\s+(.*)$/gm, '<li class="ml-4 list-disc mb-1">$1</li>');

    return formatted;
  }
}

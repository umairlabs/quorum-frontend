import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseApiCallService } from '../../../core/services/api/base-api-call.service';

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIActionProposal {
  type: string;
  params: Record<string, any>;
  summary: string;
  requires_confirmation: boolean;
}

export interface AIChatResponse {
  message: string;
  intent: 'QUERY' | 'ACTION_PROPOSAL' | 'GENERAL';
  action?: AIActionProposal | null;
}

export interface AIActionExecutionResult {
  success: boolean;
  message: string;
  data?: Record<string, any> | null;
}

@Injectable({
  providedIn: 'root'
})
export class AIAssistantApiService extends BaseApiCallService {

  public sendChatMessage(message: string, conversationHistory: AIChatMessage[] = []): Observable<AIChatResponse> {
    return this.post<AIChatResponse>('ai/chat/', {
      message,
      conversation_history: conversationHistory
    });
  }

  public executeAction(actionType: string, params: Record<string, any>): Observable<AIActionExecutionResult> {
    return this.post<AIActionExecutionResult>('ai/execute-action/', {
      action_type: actionType,
      params
    });
  }

  public getSuggestions(): Observable<{ suggestions: string[] }> {
    return this.get<{ suggestions: string[] }>('ai/suggestions/');
  }
}

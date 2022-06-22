/* eslint-disable no-cond-assign */
import { AstNode, BetweenPredicate, Parenthesis, Statement, TokenNode } from './ast';
import { EOF_TOKEN, type Token, TokenType, isToken } from './token';

/**
 * A rudimentary parser that slices token stream into list of SQL statements
 * and groups of parenthesis.
 */
export default class Parser {
  private index = 0;

  constructor(private tokens: Token[]) {}

  public parse(): Statement[] {
    const statements: Statement[] = [];
    let stat: Statement | undefined;
    while ((stat = this.statement())) {
      statements.push(stat);
    }
    return statements;
  }

  private statement(): Statement | undefined {
    const children: AstNode[] = [];
    let expr: Parenthesis | BetweenPredicate | undefined;
    while (true) {
      if (this.look().value === ';') {
        children.push(this.nextTokenNode());
        return { type: 'statement', children };
      } else if (this.look().type === TokenType.EOF) {
        if (children.length > 0) {
          return { type: 'statement', children };
        } else {
          return undefined;
        }
      } else if ((expr = this.parenthesis() || this.betweenPredicate())) {
        children.push(expr);
      } else {
        children.push(this.nextTokenNode());
      }
    }
  }

  private parenthesis(): Parenthesis | undefined {
    if (this.look().type === TokenType.OPEN_PAREN) {
      const children: AstNode[] = [];
      const token = this.next();
      const openParen = token.value;
      const hasWhitespaceBefore = Boolean(token.whitespaceBefore);
      let closeParen = '';
      while (this.look().type !== TokenType.CLOSE_PAREN && this.look().type !== TokenType.EOF) {
        children.push(this.parenthesis() || this.betweenPredicate() || this.nextTokenNode());
      }
      if (this.look().type === TokenType.CLOSE_PAREN) {
        closeParen = this.next().value;
      }
      return { type: 'parenthesis', children, openParen, closeParen, hasWhitespaceBefore };
    }
    return undefined;
  }

  private betweenPredicate(): BetweenPredicate | undefined {
    if (isToken.BETWEEN(this.look()) && isToken.AND(this.look(2))) {
      return {
        type: 'between_predicate',
        betweenToken: this.next(),
        expr1: this.next(),
        andToken: this.next(),
        expr2: this.next(),
      };
    }
    return undefined;
  }

  // Returns current token without advancing the pointer
  private look(ahead = 0): Token {
    return this.tokens[this.index + ahead] || EOF_TOKEN;
  }

  // Returns current token and advances the pointer to next token
  private next(): Token {
    return this.tokens[this.index++] || EOF_TOKEN;
  }

  private nextTokenNode(): TokenNode {
    return { type: 'token', token: this.next() };
  }
}

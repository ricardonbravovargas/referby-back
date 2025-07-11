import { Injectable, type ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to make authentication optional
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If there's an error or no user, just return null instead of throwing
    if (err || !user) {
      return null;
    }
    return user;
  }

  // Override canActivate to always return true (allow access)
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const result = super.canActivate(context);

    if (typeof result === 'boolean') {
      return true;
    }

    if (result instanceof Promise) {
      return result.then(() => true).catch(() => true);
    }

    if (result instanceof Observable) {
      return result.pipe(
        map(() => true),
        catchError(() => of(true)),
      );
    }

    return true;
  }
}

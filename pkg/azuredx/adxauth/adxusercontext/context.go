package adxusercontext

import (
	"context"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

type userCtxKey struct {
}

type CurrentUserContext struct {
	User        *backend.User
	IdToken     string
	AccessToken string
}

func WithCurrentUser(ctx context.Context, currentUser CurrentUserContext) context.Context {
	return context.WithValue(ctx, userCtxKey{}, currentUser)
}

func GetCurrentUser(ctx context.Context) (CurrentUserContext, bool) {
	resourceReq, ok := ctx.Value(userCtxKey{}).(CurrentUserContext)
	return resourceReq, ok
}

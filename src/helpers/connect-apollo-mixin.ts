/**
 * Copyright (c) IBM and its affiliates.
 *
 * This source code is licensed under the MIT license found in the LICENSE.txt
 * file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { property } from 'lit-element';
import {
  ApolloClient,
  ApolloQueryResult,
  FetchMoreOptions,
  FetchMoreQueryOptions,
  FetchResult,
  MutationOptions,
  NetworkStatus,
  ObservableQuery,
  OperationVariables,
  QueryOptions,
  WatchQueryOptions
} from 'apollo-boost';
import { GraphQLError } from 'graphql';

type Constructor<T> = new (...args: any[]) => T;

interface CustomElement extends HTMLElement {
  disconnectedCallback(): void;
}

export const connectApollo = <
  QT = any,
  QTVariables = OperationVariables,
  MT = any,
  MTVariables = OperationVariables
>(
  client: ApolloClient<unknown>
) => <T extends Constructor<CustomElement>>(baseElement: T) => {
  class ApolloQueryElement extends baseElement {
    // TODO: Make protected?
    _query?: ApolloQueryResult<QT>;

    // TODO: Make protected?
    _watchQuery?: ObservableQuery<QT, QTVariables>;

    // TODO: Make protected?
    _watchQuerySubscription?: ZenObservable.Subscription;

    // TODO: Make protected?
    _mutation?: FetchResult<MT>;

    @property({ type: Object })
    public data: QT = {} as QT;

    @property({ type: Array })
    public errors?: ReadonlyArray<GraphQLError>;

    @property({ type: Boolean })
    public loading = false;

    @property({ type: Number })
    public networkStatus?: NetworkStatus;

    @property({ type: Boolean })
    public stale?: boolean;

    // TODO: Make protected?
    _onSuccessQuery(queryResult: ApolloQueryResult<QT>) {
      this.data = queryResult.data;
      this.errors = queryResult.errors;
      this.loading = queryResult.loading;
      this.networkStatus = queryResult.networkStatus;
      this.stale = queryResult.stale;
    }

    // TODO: Make protected?
    // TODO: Manage the errors
    _onErrorQuery(error: any) {
      this.loading = false;
      console.error('query error:', error);
    }

    public async query(options: QueryOptions<QTVariables>) {
      try {
        this.loading = true;

        this._query = await client.query<QT, QTVariables>(options);
        this._onSuccessQuery(this._query);
      } catch (error) {
        this._onErrorQuery(error);
      }
    }

    public watchQuery(options: WatchQueryOptions<QTVariables>) {
      this.loading = true;

      this._watchQuery = client.watchQuery<QT, QTVariables>(options);

      this._watchQuerySubscription = this._watchQuery.subscribe({
        next: queryResult => this._onSuccessQuery(queryResult),
        error: error => this._onErrorQuery(error)
      });
    }

    public fetchMore<K extends keyof QTVariables>(
      fetchMoreOptions: FetchMoreQueryOptions<QTVariables, K> &
        FetchMoreOptions<QT, QTVariables>
    ) {
      if (!this._watchQuery) {
        console.warn('You need to run fetchMore() before running watchQuery()');
        return;
      }

      this.loading = true;

      this._watchQuery.fetchMore<K>(fetchMoreOptions);
    }

    public disconnectedCallback() {
      this._watchQuerySubscription &&
        this._watchQuerySubscription.unsubscribe();

      super.disconnectedCallback();
    }

    public async mutate(options: MutationOptions<MT, MTVariables>) {
      try {
        this.loading = true;

        this._mutation = await client.mutate<MT, MTVariables>(options);
      } catch (error) {
        this._onErrorQuery(error);
      }
    }
  }

  return ApolloQueryElement;
};
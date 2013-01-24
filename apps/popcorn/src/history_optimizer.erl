%%%
%%% Copyright 2012
%%%
%%% Licensed under the Apache License, Version 2.0 (the "License");
%%% you may not use this file except in compliance with the License.
%%% You may obtain a copy of the License at
%%%
%%%     http://www.apache.org/licenses/LICENSE-2.0
%%%
%%% Unless required by applicable law or agreed to in writing, software
%%% distributed under the License is distributed on an "AS IS" BASIS,
%%% WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
%%% See the License for the specific language governing permissions and
%%% limitations under the License.
%%%


%%%-------------------------------------------------------------------
%%% File:      history_optimizer.erl
%%% @author    Marc Campbell <marc.e.campbell@gmail.com>
%%% @doc
%%% @end
%%%-----------------------------------------------------------------

-module(history_optimizer).
-author('marc.e.campbell@gmail.com').
-behavior(gen_server).

-include("include/popcorn.hrl").

-define(SEVERITY_RETENTION_TIMER, 60000).   %% One minute

-export([start_link/0]).

-export([init/1,
         handle_call/3,
         handle_cast/2,
         handle_info/2,
         terminate/2,
         code_change/3]).

start_link() -> gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

init([]) ->
    process_flag(trap_exit, true),

    ?POPCORN_DEBUG_MSG("#history_optimizer starting"),
    erlang:send_after(?SEVERITY_RETENTION_TIMER, self(), severity_retention_expire),

    {ok, undefined}.

handle_call(Request, _From, State)  -> {stop, {unknown_call, Request}, State}.
handle_cast(_Msg, State)            -> {noreply, State}.

handle_info(severity_retention_expire, State) ->
    {ok, Retentions} = application:get_env(popcorn, log_retention),
    lists:foreach(fun({Severity, Retention_Interval}) ->
        %% for effiency, we start at the end of the table, find the most recent
        %% log line with the specified severity, delete it, and walk back.  as soon 
        %% as we hit a log entry with the specified severity that isn't subject to 
        %% retention deletion, we stop
        Microseconds = popcorn_util:retention_time_to_microsec(Retention_Interval),
        Oldest_TS    = ?NOW - Microseconds,
        Severity_Num = popcorn_util:severity_to_number(Severity),
        gen_server:cast(?STORAGE_PID, {expire_logs_matching, Severity_Num, Oldest_TS})
      end, Retentions),

    erlang:send_after(?SEVERITY_RETENTION_TIMER, self(), severity_retention_expire),
    {noreply, State};

handle_info(_Msg, State)            -> {noreply, State}.
terminate(_Reason, _State)          -> ok.
code_change(_OldVsn, State, _Extra) -> {ok, State}.


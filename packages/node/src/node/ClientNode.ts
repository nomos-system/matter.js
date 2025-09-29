/**
 * @license
 * Copyright 2022-2025 Matter.js Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActionContext } from "#behavior/context/ActionContext.js";
import { CommissioningClient } from "#behavior/system/commissioning/CommissioningClient.js";
import { ClientNetworkRuntime } from "#behavior/system/network/ClientNetworkRuntime.js";
import { NetworkClient } from "#behavior/system/network/NetworkClient.js";
import { NetworkRuntime } from "#behavior/system/network/NetworkRuntime.js";
import { Agent } from "#endpoint/Agent.js";
import { EndpointInitializer } from "#endpoint/properties/EndpointInitializer.js";
import { Identity, Lifecycle, MaybePromise } from "#general";
import { Interactable, OccurrenceManager } from "#protocol";
import { ClientNodeStore } from "#storage/client/ClientNodeStore.js";
import { RemoteWriter } from "#storage/client/RemoteWriter.js";
import { ServerNodeStore } from "#storage/server/ServerNodeStore.js";
import { Matter, MatterModel } from "@matter/model";
import { ClientEndpointInitializer } from "./client/ClientEndpointInitializer.js";
import { ClientNodeInteraction } from "./client/ClientNodeInteraction.js";
import { Node } from "./Node.js";
import type { ServerNode } from "./ServerNode.js";

/**
 * A remote Matter {@link Node}.
 *
 * Client nodes may be peers (commissioned into a shared fabric) or commissionable, in which they are not usable until
 * you invoke {@link commissioned}.
 */
export class ClientNode extends Node<ClientNode.RootEndpoint> {
    #matter: MatterModel;
    #interaction?: ClientNodeInteraction;

    constructor(options: ClientNode.Options) {
        const opts = {
            ...options,
            number: 0,
            type: ClientNode.RootEndpoint,
        };

        super(opts);

        // Block the OccurrenceManager from parent environment so we don't attempt to record events from peers
        this.env.block(OccurrenceManager);

        this.env.set(Node, this);
        this.env.set(ClientNode, this);

        this.#matter = options.matter ?? Matter;
    }

    /**
     * Model of Matter semantics understood by this node.
     *
     * Matter elements missing from this model will not support all functionality.
     */
    get matter() {
        return this.#matter;
    }

    override initialize() {
        const store = this.env.get(ServerNodeStore).clientStores.storeForNode(this);

        this.env.set(ClientNodeStore, store);

        const initializer = new ClientEndpointInitializer(this);
        this.env.set(EndpointInitializer, initializer);

        store.write = RemoteWriter(this, initializer.structure);

        initializer.structure.loadCache();

        return super.initialize();
    }

    override get owner(): ServerNode | undefined {
        return super.owner as ServerNode | undefined;
    }

    override set owner(owner: ServerNode) {
        super.owner = owner;
    }

    /**
     * Add this node to a fabric.
     */
    async commission(options: CommissioningClient.CommissioningOptions) {
        await this.act("commission", agent => agent.commissioning.commission(options));
    }

    /**
     * Remove this node from the fabric (if commissioned) and locally.
     */
    override async delete() {
        if (this.lifecycle.isCommissioned) {
            this.statusUpdate("decommissioning");

            await this.act("decommission", agent => agent.commissioning.decommission());
        }

        await super.delete();
    }

    /**
     * Force-remove the node without first decommissioning.
     *
     * If the node is still available you should use {@link delete} to remove it from the fabric.
     */
    override async erase() {
        await this.lifecycle.mutex.produce(this.eraseWithMutex.bind(this));
    }

    /**
     * Disable the node.
     *
     * This shuts down any active connections and prevents future connections until re-enabled.
     */
    async disable() {
        if (this.state.network.isDisabled) {
            return;
        }

        await this.lifecycle.mutex.produce(async () => {
            await this.cancelWithMutex();
            await this.setStateOf(NetworkClient, { isDisabled: true });
        });
    }

    /**
     * Enable the node.
     *
     * If the node is disabled but reachable, this brings it online.
     */
    async enable() {
        if (!this.state.network.isDisabled) {
            return;
        }

        await this.setStateOf(NetworkClient, { isDisabled: false });
        await this.start();
    }

    protected async eraseWithMutex() {
        // First ensure we're offline
        await this.cancelWithMutex();

        // Then reset
        await this.resetWithMutex();
    }

    protected createRuntime(): NetworkRuntime {
        return new ClientNetworkRuntime(this);
    }

    async prepareRuntimeShutdown() {}

    protected override get container() {
        return this.owner?.peers;
    }

    override act<R>(
        purpose: string,
        actor: (agent: Agent.Instance<ClientNode.RootEndpoint>) => MaybePromise<R>,
    ): MaybePromise<R>;

    override act<R>(actor: (agent: Agent.Instance<ClientNode.RootEndpoint>) => MaybePromise<R>): MaybePromise<R>;

    override act<R>(
        actorOrPurpose: string | ((agent: Agent.Instance<ClientNode.RootEndpoint>) => MaybePromise<R>),
        actor?: (agent: Agent.Instance<ClientNode.RootEndpoint>) => MaybePromise<R>,
    ): MaybePromise<R> {
        if (this.construction.status === Lifecycle.Status.Inactive) {
            this.construction.start();
        }

        if (this.construction.status === Lifecycle.Status.Initializing) {
            return this.construction.then(() => (super.act as any)(actorOrPurpose, actor));
        }

        return (super.act as any)(actorOrPurpose, actor);
    }

    get interaction(): Interactable<ActionContext> {
        if (this.#interaction === undefined) {
            this.#interaction = new ClientNodeInteraction(this);
        }

        return this.#interaction;
    }
}

export namespace ClientNode {
    export interface Options extends Node.Options<RootEndpoint> {
        matter?: MatterModel;
    }

    export const RootEndpoint = Node.CommonRootEndpoint.with(CommissioningClient, NetworkClient);

    export interface RootEndpoint extends Identity<typeof RootEndpoint> {}
}

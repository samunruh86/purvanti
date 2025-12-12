---
title: Custom storefronts
description: >-
  Familiarize yourself with building headless using the frontend tools of your
  choice by learning what custom storefronts are and how they work at Shopify.
source_url:
  html: 'https://shopify.dev/docs/storefronts/headless/getting-started'
  md: 'https://shopify.dev/docs/storefronts/headless/getting-started.md'
---

ExpandOn this page

* [What is a custom storefront?](https://shopify.dev/docs/storefronts/headless/getting-started.md#what-is-a-custom-storefront)
* [How custom storefronts work](https://shopify.dev/docs/storefronts/headless/getting-started.md#how-custom-storefronts-work)
* [When should I build a custom storefront?](https://shopify.dev/docs/storefronts/headless/getting-started.md#when-should-i-build-a-custom-storefront)
* [Key benefits](https://shopify.dev/docs/storefronts/headless/getting-started.md#key-benefits)
* [Examples](https://shopify.dev/docs/storefronts/headless/getting-started.md#examples)
* [Build options](https://shopify.dev/docs/storefronts/headless/getting-started.md#build-options)
* [Next steps](https://shopify.dev/docs/storefronts/headless/getting-started.md#next-steps)

# Custom storefronts

Commerce is constantly evolving. As a developer, you can build commerce integrations in all the places where merchants want to sell and where their customers want to buy. This guide introduces you to building headless with Shopify by explaining custom storefronts, how they work, and how they accelerate your commerce development.

***

## What is a custom storefront?

A custom storefront is a model of building headless, where the frontend and backend of your storefront are independent of each other. You build the frontend. Merchants use Shopify's commerce engine behind their bespoke storefront experiences.

![A headless commerce model where the frontend and backend of the storefront are independent](https://shopify.dev/assets/assets/images/custom-storefronts/whats-a-custom-storefront-CRF5mJWG.png)

***

## How custom storefronts work

A custom storefront is designed, built, and managed by you. This is the frontend. You can use your preferred tech stack and a development framework that you already know to build faster. You build headless by integrating your custom frontend with Shopify's powerful commerce primitives, capabilities, and backend operations.

### Data and commerce capabilities

Your custom storefront uses data and commerce capabilities from Shopify. This is the backend. Data might include [products](https://shopify.dev/docs/api/storefront/reference/products/product), [collections](https://shopify.dev/docs/api/storefront/reference/products/collection), and [customers](https://shopify.dev/docs/api/storefront/reference/customers/customer). Commerce capabilities might include [cart](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage) and [international pricing](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/markets/international-pricing).

![A subset of customer-facing experiences that you can build, such as websites and mobile apps](https://shopify.dev/assets/assets/images/custom-storefronts/how-custom-storefronts-work-mjjaTy6T.png)

### Building on an API-first platform

Headless commerce doesn't apply just to websites. For example, Shopify can also be used in other kinds of shopping experiences such as mobile apps, video games, smart devices, and more.

The benefit of building on an API-first platform is the flexibility and power of enabling new customer touchpoints, while using the same shared commerce data and backend tools that the Shopify platform provides.

Complex solutions can involve connecting other business systems to the frontend or backend, such as the following:

* Content management systems (CMS)

* Customer relationship management (CRM)

* Enterprise resource planning (ERP) systems

* Product information management (PIM) systems

***

## When should I build a custom storefront?

If a merchant's desired business system architecture, business process, or customer experience can't be achieved with Shopify's existing sales channels, custom themes, and apps, then consider building a custom storefront.

Consider building a custom storefront in the following scenarios:

* You're building a unique storefront experience that isn't possible or easily achievable with existing web or mobile tools.

* You have an existing web frontend technology stack that doesn't include [Liquid](https://shopify.dev/docs/api/liquid).

* You want to integrate Shopify-powered commerce into an existing infrastructure.

* You have robust omni-channel needs, with multiple channels not being offered out of the box.

* You're either using or looking to use a content management system (CMS) for more complex content needs that are integrated into your storefront experience.

  However, before taking on the commitment, make sure that the merchant is comfortable with taking on the added costs and complexity of managing a custom storefront solution. The merchant should also have development resources available to manage the ongoing integration after launch.

***

## Key benefits

Building a custom storefront offers the following key benefits:

* **Flexibility**: The Storefront API is device-agnostic and platform-agnostic. You can build a custom storefront using any programming language, which makes your workflow flexible.
* **Customization**: You can build a solution that grows and adapts with a merchant's business. As customer trends and interactions change, the commerce solution can adapt quickly to long-term market shifts in customer acquisition.
* **Integration**: Bring your own tools, technology stack, and experience, and integrate your custom backend with Shopify commerce data.

***

## Examples

With a custom storefront solution, you have complete flexibility in your frontend tech stack and development framework. The following examples describe some of the ways that you can customize a storefront:

* Sell products from a native mobile app or a progressive web application (PWA)
* Sell products in augmented reality (AR) or virtual reality (VR) game experiences
* Sell products in video livestreams
* Sell products through the Internet of things (IoT), such as selling food directly from a smart fridge
* Sell products through a buy button added to an existing website

### Hydrogen demo store

The Hydrogen demo store is Shopify's example custom storefront. You can refer to it to understand how a custom storefront can be put together, or fork it as a starting point to build your own custom storefront.

[Hydrogen demo store\
\
](https://github.com/Shopify/hydrogen-demo-store)

[Explore the source code of the example Hydrogen demo store.](https://github.com/Shopify/hydrogen-demo-store)

***

## Build options

Shopify provides a range of [development frameworks, SDKs, and software tools](https://shopify.dev/docs/storefronts/headless/getting-started/build-options) to accelerate your development process.

***

## Next steps

* [Learn about your options for building custom storefronts](https://shopify.dev/docs/storefronts/headless/getting-started/build-options).

***

* [What is a custom storefront?](https://shopify.dev/docs/storefronts/headless/getting-started.md#what-is-a-custom-storefront)
* [How custom storefronts work](https://shopify.dev/docs/storefronts/headless/getting-started.md#how-custom-storefronts-work)
* [When should I build a custom storefront?](https://shopify.dev/docs/storefronts/headless/getting-started.md#when-should-i-build-a-custom-storefront)
* [Key benefits](https://shopify.dev/docs/storefronts/headless/getting-started.md#key-benefits)
* [Examples](https://shopify.dev/docs/storefronts/headless/getting-started.md#examples)
* [Build options](https://shopify.dev/docs/storefronts/headless/getting-started.md#build-options)
* [Next steps](https://shopify.dev/docs/storefronts/headless/getting-started.md#next-steps)
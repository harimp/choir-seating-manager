import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import { HostedZone, NsRecord, ZoneDelegationRecord } from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

export class DomainStack extends Construct{
    private CRUX_DOMAIN = "harimp.com";
    private HOST_DOMAIN = `choir.${this.CRUX_DOMAIN}`;

    public hostedZone: HostedZone;
    public certificate: Certificate;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // Hosted Zone for parent domain
        const parentHostedZone = HostedZone.fromLookup(this, 'ParentHostedZone', {
            domainName: this.CRUX_DOMAIN,
        });

        this.hostedZone = new HostedZone(this, 'ChoirSeatingManagerHostedZone', {
            zoneName: this.HOST_DOMAIN,
        });

        new NsRecord(this, 'ChoirSeatingManagerNSRecord', {
            zone: parentHostedZone,
            recordName: this.HOST_DOMAIN,
            values: this.hostedZone.hostedZoneNameServers || [],
        });

        // ACM Certificate for the domain
        this.certificate = new Certificate(this, 'ChoirSeatingManagerCertificate', {
            domainName: this.HOST_DOMAIN,
            validation: CertificateValidation.fromDns(this.hostedZone),
        });
    }
}